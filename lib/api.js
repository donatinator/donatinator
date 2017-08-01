// --------------------------------------------------------------------------------------------------------------------

"use strict"

// npm
const async = require('async')

// local
const db = require('./db.js')

// --------------------------------------------------------------------------------------------------------------------

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

function insSingleCharge(obj, callback) {
  db.insObj(null, obj, 'single_charge', callback)
}

function selSingleDonationsAll(callback) {
  db.getAllArr(null, "SELECT * FROM single_charge ORDER BY id DESC", callback)
}

function selPagesAll(callback) {
  db.getAllArr(null, "SELECT * FROM page ORDER BY position, name", callback)
}

// --------------------------------------------------------------------------------------------------------------------

module.exports = {
  selSettings,
  saveSettings,
  insSingleCharge,
  selSingleDonationsAll,
  selPagesAll,
}

// --------------------------------------------------------------------------------------------------------------------
