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

// In all of these examples, where `query` is specified, it could be either:
//
// 1. an sql string such as 'SELECT ...'
// 2. a query object of { text : '...', values : [ ... ] }

function exec(poolOrClient, query, callback) {
  // default to the pool
  poolOrClient = poolOrClient || pool

  poolOrClient.query(query, callback)
}

function getOne(query, callback) {
  // default to the pool
  poolOrClient = poolOrClient || pool

  // change the query from text to an object
  if ( typeof query === 'string' ) {
    query = {
      text : sql,
    }
  }

  pool.query(query, (err, res) => {
    if (err) return callback(err)

    // if nothing there
    if ( res.rows.length === 0 ) {
      return callback(null, null)
    }

    // if we have more than one row, give a warning but return the first anyway
    if ( res.rows.length > 1 ) {
      console.warn("Query returned more than one row but expected only one : " + query.text)
    }

    callback(null, res.rows[0])
  })
}

// Returns either [] or an array of objects such as [ { ... }, { ... }, ... ]
function getAllArr(poolOrClient, query, callback) {
  // default to the pool
  poolOrClient = poolOrClient || pool

  poolOrClient.query(query, (err, res) => {
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
function getAllObj(poolOrClient, query, name, callback) {
  // default to the pool
  poolOrClient = poolOrClient || pool

  poolOrClient.query(query, (err, res) => {
    if (err) return callback(err)

    // if nothing there, return early
    if ( res.rows.length === 0 ) {
      return callback(null, {})
    }

    let data = {}
    res.rows.forEach(row => {
      data[row[name]] = row
    })

    callback(null, data)
  })
}

// -- higher level functions ---

function insObj(poolOrClient, obj, tablename, callback) {
  let keys = Object.keys(obj)

  // default to the pool
  poolOrClient = poolOrClient || pool

  // the sql statement
  let sql = "INSERT INTO " + tablename + "(" + keys.join(', ') + ") VALUES(" + keys.map((key, i) => '$' + (i+1)).join(', ') + ")"

  // exec this query
  let query = {
    text   : sql,
    values : keys.map(key => obj[key]),
  }
  exec(poolOrClient, query, callback)
}

// --------------------------------------------------------------------------------------------------------------------

module.exports = {
  pool,
  getOne,
  getAllArr,
  getAllObj,
  insObj,
}

// --------------------------------------------------------------------------------------------------------------------
