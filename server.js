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
    let prev
    do {
        console.clear()
        console.log(fs.readFileSync('welcome.md','utf8'))
        
        const searchData = await searchPrompt()
        prev = false

        if(searchData){
            const changeData = await inquirer.prompt({
                message:'What would you want to do?', 
                type: 'list', 
                name:'action', 
                choices: ['Add','Update','Delete','RETURN'].map(choice => {
                    name = (choice == 'RETURN')? choice : `${choice} ${searchData.search.result}`
                    value = (choice == 'RETURN')? 'true' : `${choice.toLowerCase()}Prompt(searchData)`
                    disabled = (searchData.tableList != '')? false
                             : (['Add','RETURN'].includes(choice))? false : true

                    return {name,value,disabled}
                })
            })
            prev = await eval(changeData.action)
        }

    } while(prev)

    await db.close()
}


// Initial Search Prompt Function
async function searchPrompt(){
    const search = await inquirer.prompt({
        message:'Viewing:', 
        type: 'list', 
        name:'result', 
        choices:['Department', 'Role', 'Employee', 'EXIT']
    })

    if (search.result == 'EXIT') return
    
    const tableList = await db.query( 'SELECT * FROM ??', [search.result])
    console.table( tableList )
    return {search, tableList}
}


// Delete Prompt Function
async function deletePrompt(data){
    const objKeys = await getColumns(data)

    const choices = data.tableList.map(table => {
        return `${table[objKeys[0]]}. ${table[objKeys[1]]} ${objKeys[2] == 'last_name' ? table[objKeys[2]] : ''}`
    })
    choices.push('CANCEL')

    const choiceDelete = await inquirer.prompt({
        message:`Which ${data.search.result.toLowerCase()} to delete:`, 
        type: 'list', 
        name:'delete', 
        choices
    })

    if(choiceDelete.delete == 'CANCEL') return true

    console.log(choiceDelete.delete.split('.')[0])
    await db.query( 'DELETE FROM ?? WHERE id=?', [data.search.result,choiceDelete.delete.split('.')[0]])
    return true
}


// Update Prompt Function
async function updatePrompt(data){
    const objKeys = await getColumns(data)

    const choices = data.tableList.map( function(table){
        return `${table[objKeys[0]]}. ${table[objKeys[1]]} ${objKeys[2] == 'last_name' ? table[objKeys[2]] : ''}`
    })

    const choiceDelete = await inquirer.prompt({
        message:`Which ${data.search.result.toLowerCase()} to update:`,
        type: 'list',
        name:'delete',
        choices
    })

}


// Add Prompt Function
async function addPrompt(data){
    const objKeys = await getColumns(data)
    let newValues = {}

    for( const col of objKeys){
        if(col == 'id') newValues.id = null
        else{
            const input = await inquirer.prompt({
                message: `Input ${col} value:`,
                type:'input',
                name: col
            })
            newValues = Object.assign(newValues, input)
        }
    }

    await db.query( 'INSERT INTO ?? VALUES(?)', [data.search.result,Object.values(newValues)])
    return true
}


// Get Column Names from SQL Table
async function getColumns(data){
    const table = data.search.result
    const columns = await db.query( `SELECT column_name FROM information_schema.columns WHERE table_name = N'${table}' ORDER BY ordinal_position`)
    return columns.map(table => table.COLUMN_NAME)
}

mainApp()