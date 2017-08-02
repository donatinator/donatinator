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

function selPagesAll(callback) {
  db.getAllArr(null, "SELECT * FROM page ORDER BY position, name", callback)
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
    text   : "UPDATE page SET name = $1, title = $2, content = $3, html = $4 WHERE name = $5",
    values : [ obj.name, obj.title, obj.content, obj.html, obj.name ],
  }
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
  selPagesAll,
  getPage,
  updPage,
}

// --------------------------------------------------------------------------------------------------------------------
