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

        const search = await searchPrompt()

        if(!search) prev = search
        else {
            do{
                // Action Function
                const tableList = await db.query( 'SELECT * FROM ??', [search])
                console.table( tableList )

                const {action} = await inquirer.prompt({
                    message:'What would you want to do?', 
                    type: 'list', 
                    name:'action', 
                    choices: ['Add','Update','Delete','RETURN'].map(choice => {
                        name = (choice == 'RETURN')? choice : `${choice} ${search}`
                        value = (choice == 'RETURN')? 'true' : `${choice.toLowerCase()}Prompt(search, tableList)`
                        disabled = (tableList != '')? false
                            : (['Add','RETURN'].includes(choice))? false 
                            : true
    
                        return {name,value,disabled}
                    })
                })
                prev = await eval(action)
            }while(!prev)
        }

    } while(prev)

    console.clear()
    await db.close()
}


// Initial Search Prompt Function
async function searchPrompt(){
    const {search} = await inquirer.prompt({
        message:'Viewing:', 
        type: 'list', 
        name:'search', 
        choices:['Department', 'Role', 'Employee', 'EXIT']
    })

    if (search == 'EXIT') return
    return search
}


// Delete Prompt Function
async function deletePrompt(search, tableList){
    const columns = await getColumns(search)


    let choices = tableList.map(table => {
        return `${table[columns[0]]}. ${table[columns[1]]} ${columns[2] == 'last_name' ? table[columns[2]] : ''}`
    })
    choices = [...choices, 'CANCEL']

    const {deleteData} = await inquirer.prompt({
        message:`Which ${search.toLowerCase()} to delete:`, 
        type: 'list', 
        name:'deleteData', 
        choices
    })

    if(deleteData == 'CANCEL') return false

    await db.query( 'DELETE FROM ?? WHERE id=?', [ search , deleteData.split('.')[0] ])
    return false
}


// Update Prompt Function
async function updatePrompt(search, tableList){
    const columns = await getColumns(search)

    let choices = tableList.map(table =>{
        return `${table[columns[0]]}. ${table[columns[1]]} ${columns[2] == 'last_name' ? table[columns[2]] : ''}`
    })
    choices = [...choices, 'CANCEL']

    const {updateData} = await inquirer.prompt({
        message:`Which ${search.toLowerCase()} to update:`,
        type: 'list',
        name:'updateData',
        choices
    })
    
    if(updateData == 'CANCEL') return false

    let repeat = false
    do{
        const {changeField,changeValue,changeMore} = await inquirer.prompt([
            { message: 'What would you like to edit?', type:'list', name: 'changeField', choices: columns.filter( col => col != 'id') },
            { message: edit => `Input new ${edit.changeField} value`, type: 'input', name: 'changeValue'},
            { message: 'Edit more?', type: 'confirm', name: 'changeMore'}
        ])

        await db.query( `UPDATE ?? SET ${changeField} = ? WHERE id=?`, [ search, changeValue, updateData.split('.')[0]])
        repeat = changeMore

    } while (repeat)

    return false

}


// Add Prompt Function
async function addPrompt(search, tableList){
    let newValues = {}

    for( const col of await getColumns(search)){
        if(col == 'id') newValues.id = null
        else{
            const input = await inquirer.prompt({
                message: `Input ${col} value:`,
                type:'input',
                name: col
            })
            newValues = {...newValues, ...input}
        }
    }

    await db.query( 'INSERT INTO ?? VALUES(?)', [ search , Object.values(newValues) ])
    return false
}


// Get Column Names from SQL Table
async function getColumns(search){
    const columns = await db.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = N'${search}' 
        ORDER BY ordinal_position`)
        
    return columns.map(table => table.COLUMN_NAME)
}

mainApp()