import express from 'express'
import {graphqlHTTP} from 'express-graphql'
import {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLString,
  GraphQLList,
  GraphQLInt,
  GraphQLNonNull
} from 'graphql'
import {makeExecutableSchema} from 'graphql-tools'
import { find, filter } from 'lodash';
const { Client } = require('pg')
const client = new Client({
  user: 'postgres',
  host: 'localhost',
  database: 'Catalogue',
  password: 'kejiisking9203',
  port: 5432,
})



var session = false
async function getConnection( 
){
  await client.connect();
}

getConnection()
async function getBooks(){
  const res = await client.query('SELECT * from book')
  return res.rows
}
async function getuserbooks(userid){
  const res = await client.query(`SELECT * from book where userid = $1`,[userid])
  return res.rows
}

async function getAuthor(authorid){
  //console.log(typeof id)
  const res = await client.query('SELECT * from author')
  var authors= res.rows
 // console.log(authors)
   
  
  return find(authors, {authorid} )// authorid : authorid
}

async function getUsers(){
  const res = await client.query('SELECT * from users')
  return res.rows
}
async function getBookAuthor(authorid){

  const res = await client.query('SELECT * from author')
  var authors= res.rows

   
  
  return find(authors, {authorid} )

}

async function login(email, password){
  //console.log(email)
  //console.log(password)
  const res = await client.query(`SELECT * from users where email = $1 and password =$2`,[email, password])
  if (res.rows[0]!= undefined){
   
    session = true // use localstorage to make session true
    return res.rows[0].userid
  }
  else{
    return "doesnotexist"
  }
}

async function registeruser(email, password){
 
  var userid = await client.query(`SELECT max(userid) from users`)

  userid=userid.rows[0].max +1
  const res = await client.query(`insert into users values(${userid},'${email}','${password}')`)
  return userid
}

async function addbook(title, year, rating, authorname,userid){
  
  const res = await client.query(`SELECT authorid from author where name = $1 `,[authorname])
  

 

  var bookid = await client.query(`SELECT max(bookid) from book`)
  bookid =bookid.rows[0].max +1
  console.log(bookid)
  var authorid = await client.query(`SELECT max(authorid) from author`)
  authorid = authorid.rows[0].max +1
  console.log(authorid)
  

  if (res.rows[0]!= undefined || res.rows[0]!= null){
    //console.log(res.rows[0].authorid)
    const exist = await client.query(`select * from book where title = '${title}' and userid= ${userid} and authorid = ${res.rows[0].authorid}`)
    if(exist.rows[0]!= undefined){
      return "already exists"
    }
    await client.query(`insert into book values(${bookid},${res.rows[0].authorid},${userid},'${title}',${year},${rating})`)
    
    return "added"
    
  }
  
  
  await client.query(`insert into author values(${authorid},'${authorname}')`)
  await client.query(`insert into book values(${bookid},${authorid},${userid},'${title}',${year},${rating})`)
 
    
  
  return "added"

}

async function editbook(oldtitle, oldauthor,title, year, rating, authorname,userid){
  
  const res = await client.query(`SELECT authorid from author where name = $1 `,[oldauthor])
 
  const newauthor = await client.query(`SELECT authorid from author where name = $1 `,[authorname])
  const exist = await client.query(`select bookid from book where title = '${oldtitle}' and userid= ${userid} and authorid = ${res.rows[0].authorid}`)
  
  
 
  const editing = await client.query(`update book set title = '${title}',authorid = ${newauthor.rows[0].authorid}, year_of_publication=${year}, rating=${rating} where bookid= ${exist.rows[0].bookid}`)
 
 

  return "edited"

}
async function deletebook(title,userid){
  const res = await client.query(`delete from book where title = $1 and userid = $2`,[title, userid])

  var bookid= res.rows[0].bookid
  console.log(bookid)

  return "deleted"

}





const typeDefs = `
  type Author {
    authorid: Int!
	  name : String
    written_books: [Book]
  }

  type Book {
    bookid: Int!
    title: String
    year_of_publication: Int
    rating : Int
    author: Author
    userid: Int!
  }

  # the schema allows the following query:
  type Query {
    books: [Book]
    author(authorid: Int!): Author
    login(email: String!, password: String! ): String
    userbooks(userid: Int!): [Book]
  }

  type User{
    userid: Int!
    email: String
    password: String
  }
  type Mutation {
    addBook (
      title: String
      year_of_publication: Int
      rating : Int
      authorname: String
      userid: Int!
    ): String
    deleteBook (title:String, userid: Int!): String
    register (email:String!, password:String!): String
    editBook( 
      oldtitle: String
      oldauthor: String
      title: String
      year_of_publication: Int
      rating : Int
      authorname: String
      userid: Int!): String
  }
`;

const resolvers = {
  Query: {
    books: () => getBooks(),
    author: (_, { authorid }) => getAuthor(authorid),
    login: (_, {email, password}) => login(email, password),
    userbooks : (_, { userid}) => getuserbooks(userid)
  },


  Mutation: {
    addBook: (_, { title, year_of_publication, rating, authorname, userid }) => 
     
   addbook(title, year_of_publication, rating, authorname, userid),
   deleteBook: (_, { title,userid})=> deletebook(title, userid),
   register:(_,{email, password}) => registeruser(email, password),
   editBook: (_, { oldtitle, oldauthor, title, year_of_publication, rating, authorname, userid }) => editbook(oldtitle, oldauthor, title, year_of_publication,rating, authorname, userid)
      
  },



  Author: {
	written_books: author => filter(books, { authorid: author.authorid }),
  },

  Book: {
    author: book => getBookAuthor(book.authorid ),
  },
};
const app = express()





const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
})
app.use('/graphql', graphqlHTTP({
  schema,
  graphiql: true,
}))

app.get('/', (req,res) => res.sendFile(__dirname +"/login.html"))
app.get('/mainpage', function(req,res){
  if (session == false){ // if user tries to access this page without logging in
      res.redirect("/")
  }
  else{
    res.sendFile(__dirname +"/mainpage.html")
  }
})
app.get('/add', function(req,res){
  if (session == false){ // if user tries to access this page without logging in
      res.redirect("/")
  }
  else{
    res.sendFile(__dirname +"/addpage.html")
  }
})

app.get('/edit', function(req,res){
  if (session == false){ // if user tries to access this page without logging in
      res.redirect("/")
  }
  else{
    res.sendFile(__dirname +"/editpage.html")
  }
})



const host = process.env.host || 'localhost'
const port = process.env.port || 8000

app.listen(port, host, () => {
  console.debug(`Server is running at http://${host}:${port}`)
})

export default app
