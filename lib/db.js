// --------------------------------------------------------------------------------------------------------------------
//
// Note: I realise we're doing some of this stuff by hand rather than using an ORM. In my experience an ORM adds
// cognitive overhead in comparison to just using plain SQL. If we were a much larger project with more than 20 or so
// tables then we might look at an ORM.
//
// Otherwise, let's just keep it simple. All we want to do is a few operations. We don't even need any kind of
// pagination yet, so that also lower complexity.
//
// --------------------------------------------------------------------------------------------------------------------

"use strict"

// npm
const pg = require('pg')

// --------------------------------------------------------------------------------------------------------------------

const pool = new pg.Pool({
  connectionString : process.env.DATABASE_URL,
})

function getOne(sql, callback) {
  pool.query(sql, (err, res) => {
    if (err) return callback(err)

    // if nothing there
    if ( res.rows.length === 0 ) {
      return callback(null, null)
    }

    // if we have more than one row, give a warning but return the first anyway
    if ( res.rows.length > 1 ) {
      console.warn("Query returned more than one row but expected only one : " + sql)
    }

    callback(null, res.rows[0])
  })
}

// Returns either [] or an array of objects such as [ { ... }, { ... }, ... ]
function getAllArr(sql, callback) {
  pool.query(sql, (err, res) => {
    if (err) return callback(err)

    // console.log('res:', res)

    // if nothing there
    if ( res.rows.length === 0 ) {
      return callback(null, [])
    }

    callback(null, res.rows)
  })
}

// Returns either {} or an object of objects such as [ { ... }, { ... }, ... ]
function getAllObj(sql, key, callback) {
  pool.query(sql, (err, res) => {
    if (err) return callback(err)

    // if nothing there, return early
    if ( res.rows.length === 0 ) {
      return callback(null, {})
    }

    let data = {}
    res.rows.forEach(row => {
      data[row[key]] = row
    })

    callback(null, data)
  })
}

// --------------------------------------------------------------------------------------------------------------------

module.exports = {
  pool,
  getOne,
  getAllArr,
  getAllObj,
}

// --------------------------------------------------------------------------------------------------------------------
