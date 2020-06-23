// loads confirmation information from the .env file
require('dotenv').config()
require('console.table')

const mysql = require("mysql");
const inquirer = require("inquirer");
const fs = require('fs')

// Database Class
class Database {
    constructor( config ) {
        this.connection = mysql.createConnection( config );
    }
    query( sql, args ) {
        return new Promise( ( resolve, reject ) => {
            this.connection.query( sql, args, ( err, rows ) => {
                if ( err )
                    return reject( err );
                resolve( rows );
            } );
        } );
    }
    close() {
        return new Promise( ( resolve, reject ) => {
            this.connection.end( err => {
                if ( err )
                    return reject( err );
                resolve();
            } );
        } );
    }
  }


// Access SQL Database
const db = new Database({
    host: "localhost",
    port: 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PWD,
    database: process.env.DB_NAME,
    insecureAuth : true
});


// Startup Function
async function mainApp(){
    console.clear()
    console.log(fs.readFileSync('welcome.md','utf8'))

    const searchData = await searchPrompt()
    deletePrompt(searchData)
}


// Initial Prompt Function
async function searchPrompt(){
    const result = await inquirer.prompt(
        {message:'Viewing:', type: 'list', name:'search', choices:['Department', 'Role', 'Employee']}
    )

    const tableList = await db.query( `SELECT * FROM ${result.search}`)
    console.table( tableList )
    return {result, tableList}
}


// Delete Prompt Function
async function deletePrompt(searchData){
    const objKeys = Object.keys(searchData.tableList[0])
    const choiceList = searchData.tableList.map(data => `${data[objKeys[0]]}. ${data[objKeys[1]]}`)

    const choiceDelete = await inquirer.prompt(
        {message:`Which ${searchData.result.search} to delete:`, type: 'list', name:'delete', choices: choiceList}
    )

    console.log(choiceDelete.delete.split('.'))
}



mainApp()