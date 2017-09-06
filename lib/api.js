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

// local
const db = require('./db.js')

// --------------------------------------------------------------------------------------------------------------------

// --- table : setting ---

function selSettings(callback) {
  db.getAllObj(null, "SELECT id, name, value FROM setting", 'name', callback)
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

function insDonation(obj, callback) {
  db.insObj(null, obj, 'donation', callback)
}

function selDonationsAll(callback) {
  db.getAllArr(null, "SELECT * FROM donation ORDER BY id DESC", callback)
}

// --- table : page ---

function insPage(obj, callback) {
  db.insObj(null, obj, 'page', callback)
}

function selPagesAll(callback) {
  db.getAllArr(null, "SELECT * FROM page ORDER BY position, name", callback)
}

function selPagesAllMenu(callback) {
  db.getAllArr(null, "SELECT * FROM page WHERE position IS NOT NULL ORDER BY position", callback)
}

function getPage(name, callback) {
  const query = {
    text   : "SELECT * FROM page WHERE name = $1",
    values : [ name ],
  }
  db.getOne(null, query, callback)
}

function updPage(obj, callback) {
  const query = {
    text   : "UPDATE page SET name = $1, title = $2, content = $3, html = $4 WHERE id = $5",
    values : [ obj.name, obj.title, obj.content, obj.html, obj.id ],
  }
  db.getOne(null, query, callback)
}

// --- table : gift ---

function selGiftsAll(callback) {
  const sql = "SELECT * FROM gift ORDER BY amount, inserted"
  db.getAllArr(null, sql, callback)
}

function getGift(id, callback) {
  const query = {
    text   : "SELECT * FROM gift WHERE id = $1",
    values : [ id ],
  }
  db.getOne(null, query, callback)
}

function insGift(gift, callback) {
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
  db.exec(null, query, callback)
}

function updGift(id, gift, callback) {
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
  db.exec(null, query, callback)
}

function delGift(id, callback) {
  var query = {
    text   : `
      DELETE FROM
        gift
      WHERE
        id = $1
    `,
    values : [ id ],
  }
  db.exec(null, query, callback)
}

// --- Events ---

function selEventsAll(callback) {
  db.getAllArr(null, "SELECT * FROM event ORDER BY inserted DESC", callback)
}

function insEvent(id, username, data, callback) {
  let query = {
    text   : `
      INSERT INTO
        event(id, account_id, data)
      VALUES(
        $1,
        (SELECT id FROM account WHERE username = $2),
        $3
      )
    `,
    values : [ id, username, JSON.stringify(data) ],
  }
  db.exec(null, query, callback)
}

function insEventStripe(data, callback) {
  if ( data.id === 'evt_00000000000000' ) {
    data.id = 'evt_' + Date.now()
  }
  insEvent(data.id, 'stripe', data, callback)
}

// --- utility ---

function getTimestamp(callback) {
  const query = "SELECT CURRENT_TIMESTAMP"
  db.getOne(null, query, callback)
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
  insEvent,
  insEventStripe,
  // utility / general
  getTimestamp,
}

// --------------------------------------------------------------------------------------------------------------------
