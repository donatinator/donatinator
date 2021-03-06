// --------------------------------------------------------------------------------------------------------------------
//
//  The Donatinator - A secure way to accept Single/Recurring Donations.
//  Copyright (C) 2017 Andrew Chilton <andychilton@gmail.com> (https://chilts.org)
//
// --------------------------------------------------------------------------------------------------------------------
//
//  This program is free software: you can redistribute it and/or modify
//  it under the terms of the GNU Affero General Public License as published by
//  the Free Software Foundation, either version 3 of the License, or
//  (at your option) any later version.
//
//  This program is distributed in the hope that it will be useful,
//  but WITHOUT ANY WARRANTY; without even the implied warranty of
//  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//  GNU Affero General Public License for more details.
//
//  You should have received a copy of the GNU Affero General Public License
//  along with this program.  If not, see <http://www.gnu.org/licenses/>.
//
// --------------------------------------------------------------------------------------------------------------------

"use strict"

// npm
const async = require('async')
const pgtrans = require('pgtrans')

// local
const db = require('./db.js')

// --------------------------------------------------------------------------------------------------------------------

// --- table : setting ---

function selSettings(poolOrClientOrNull, callback) {
  db.getAllObj(poolOrClientOrNull, "SELECT id, name, value FROM setting", 'name', callback)
}

// Here we are taking name/value pairs. So the steps we take are:
//
// * start a transaction
// * loop over all name/values
// * do an insert on conflict update
// * commit
function saveSettings(settings, callback) {
  let client, done

  async.series(
    [
      // start transaction
      (stepDone) => {
        db.pool.connect((err, newClient, clientDone) => {
          if (err) return stepDone(err)

          client = newClient
          done = clientDone
          stepDone()
        })
      },
      // begin
      (stepDone) => {
        client.query("BEGIN", stepDone)
      },
      // loop over each setting and insert/update
      (stepDone) => {
        async.eachOfSeries(
          settings,
          (val, name, settingDone) => {
            let sql = "INSERT INTO setting(name, value) VALUES($1, $2) ON CONFLICT(name) DO UPDATE SET value = $3"
            let params = [ name, val, val ]
            client.query(sql, params, (err, res) => {
              if (err) return settingDone(err)
              settingDone()
            })
          },
          stepDone
        )
      },
      (stepDone) => {
        // commit
        client.query("COMMIT", stepDone)
      },
    ],
    (err) => {
      // now figure out if we need to rollback
      if (err) {
        // ToDo: rollback
        client.query("ROLLBACK", (err2) => {
          if (err2) {
            console.warn("Error trying to rollback the transaction : ", err2)
          }
          done()
          return callback(err)
        })
        return
      }

      // commit
      done()
      return callback()
    }
  )
}

// --- table : donation ---

function insDonation(poolOrClientOrNull, obj, callback) {
  db.insObj(poolOrClientOrNull, obj, 'donation', callback)
}

function selDonationsAll(poolOrClientOrNull, callback) {
  db.getAllArr(poolOrClientOrNull, "SELECT * FROM donation ORDER BY id DESC", callback)
}

// --- table : page ---

function insPage(poolOrClientOrNull, obj, callback) {
  db.insObj(poolOrClientOrNull, obj, 'page', callback)
}

function selPagesAll(poolOrClientOrNull, callback) {
  db.getAllArr(poolOrClientOrNull, "SELECT * FROM page ORDER BY position, name", callback)
}

function selPagesAllMenu(poolOrClientOrNull, callback) {
  db.getAllArr(poolOrClientOrNull, "SELECT * FROM page WHERE position IS NOT NULL ORDER BY position", callback)
}

function getPage(poolOrClientOrNull, name, callback) {
  const query = {
    text   : "SELECT * FROM page WHERE name = $1",
    values : [ name ],
  }
  db.getOne(poolOrClientOrNull, query, callback)
}

function updPage(poolOrClientOrNull, obj, callback) {
  const query = {
    text   : "UPDATE page SET name = $1, title = $2, content = $3, html = $4 WHERE id = $5",
    values : [ obj.name, obj.title, obj.content, obj.html, obj.id ],
  }
  db.getOne(poolOrClientOrNull, query, callback)
}

// --- table : gift ---

function selGiftsAll(poolOrClientOrNull, callback) {
  const sql = "SELECT * FROM gift ORDER BY amount, inserted"
  db.getAllArr(poolOrClientOrNull, sql, callback)
}

function getGift(poolOrClientOrNull, id, callback) {
  const query = {
    text   : "SELECT * FROM gift WHERE id = $1",
    values : [ id ],
  }
  db.getOne(poolOrClientOrNull, query, callback)
}

function insGift(poolOrClientOrNull, gift, callback) {
  var query = {
    text   : `
      INSERT INTO
        gift(id, name, description, amount, currency, statement)
      VALUES(
        $1,
        $2,
        $3,
        $4,
        (SELECT value FROM setting WHERE name = 'currency'),
        $5
      )
    `,
    values : [ gift.id, gift.name, gift.description, gift.amount, gift.statement ],
  }
  db.exec(poolOrClientOrNull, query, callback)
}

function updGift(poolOrClientOrNull, id, gift, callback) {
  var query = {
    text   : `
      UPDATE
        gift
      SET
        id          = $1,
        name        = $2,
        description = $3,
        amount      = $4,
        statement   = $5
      WHERE
        id = $6
    `,
    values : [ gift.id, gift.name, gift.description, gift.amount, gift.statement, id ],
  }
  db.exec(poolOrClientOrNull, query, callback)
}

function delGift(poolOrClientOrNull, id, callback) {
  var query = {
    text   : `
      DELETE FROM
        gift
      WHERE
        id = $1
    `,
    values : [ id ],
  }
  db.exec(poolOrClientOrNull, query, callback)
}

// --- Events ---

function selEventsAll(poolOrClientOrNull, callback) {
  db.getAllArr(poolOrClientOrNull, "SELECT * FROM event ORDER BY inserted DESC", callback)
}

function getEvent(poolOrClientOrNull, id, callback) {
  const query = {
    text   : "SELECT * FROM event WHERE id = $1",
    values : [ id ],
  }
  db.getOne(poolOrClientOrNull, query, callback)
}

function insEvent(poolOrClientOrNull, id, email, payload, callback) {
  let query = {
    text   : `
      INSERT INTO
        event(id, account_id, payload)
      VALUES(
        $1,
        (SELECT id FROM account WHERE email = $2),
        $3
      )
    `,
    values : [ id, email, JSON.stringify(payload) ],
  }
  db.exec(poolOrClientOrNull, query, callback)
}

// Note: for this function, we use 'stripe' as the 'account.email' since it is a system account.
function insEventStripe(poolOrClientOrNull, payload, callback) {
  // if we have an event of this `id`, it is a test webhook from the Stripe admin interface
  if ( payload.id === 'evt_00000000000000' ) {
    // Fake the ID in the case where we are testing the webhooks and receiving payloads
    // with an id of "evt_00000000000000" ... so we don't trigger the unique constraint
    // in the database on `event(id)`.
    payload.id = 'evt_ts_' + Date.now() // e.g. evt_ts_1504739623014
  }
  insEvent(poolOrClientOrNull, payload.id, 'stripe', payload, callback)
}

// --- accounts ---

function getAccount(poolOrClientOrNull, id, callback) {
  console.log('getAccount() - ' + id)

  const query = {
    text   : "SELECT * FROM account WHERE id = $1",
    values : [ id ],
  }
  db.getOne(poolOrClientOrNull, query, callback)
}

function getAccountUsingEmail(poolOrClientOrNull, email, callback) {
  console.log('getAccountUsingEmail() - ' + email)

  const query = {
    text   : "SELECT * FROM account WHERE email = $1",
    values : [ email ],
  }
  db.getOne(poolOrClientOrNull, query, callback)
}

function insAccount(poolOrClientOrNull, email, title, password, stripeCus, callback) {
  const account = {
    email    : email,
    title    : title,
    password : password,
  }
  if ( stripeCus ) {
    account.stripe_cus = stripeCus
  }
  db.insObj(poolOrClientOrNull, account, 'account', callback)
}

// --- utility ---

function getTimestamp(poolOrClientOrNull, callback) {
  const query = "SELECT CURRENT_TIMESTAMP"
  db.getOne(poolOrClientOrNull, query, callback)
}

// --------------------------------------------------------------------------------------------------------------------

module.exports = {
  // settings
  selSettings,
  saveSettings,
  // donations
  insDonation,
  selDonationsAll,
  // pages
  insPage,
  selPagesAll,
  selPagesAllMenu,
  getPage,
  updPage,
  // gifts
  selGiftsAll,
  getGift,
  insGift,
  updGift,
  delGift,
  // events
  selEventsAll,
  getEvent,
  insEvent,
  insEventStripe,
  // accounts
  getAccount,
  getAccountUsingEmail,
  insAccount,
  // utility / general
  getTimestamp,
}

// --------------------------------------------------------------------------------------------------------------------
