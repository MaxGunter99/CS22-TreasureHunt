const axios = require("axios");
const fs = require("fs");

const getInit = async ( shop , items ) => {

    token = "Token 799a4e295b4919d847477f5c72308f06b8284d99";

    return axios
        .get( 'https://lambda-treasure-hunt.herokuapp.com/api/adv/init/' , { headers: { Authorization: token } } )

        .then(results => {
            let x = results.data.room_id
            console.log( x )

            if ( shop == true ) {

                if ( x == 1 ) {
                    sellTreasure( items , results.data.cooldown )

                } else {
                    readMap( x , results.data.cooldown , shop )

                }

            } else {

                console.log( 'Not going to the shop' )
                readMap( x , results.data.cooldown , shop )

            }

            return results.data;

        })

        .catch( error => {
            console.log( error );

        });

};

const getInventory = () => {

    token = "Token 799a4e295b4919d847477f5c72308f06b8284d99";

    return axios
        .post( 'https://lambda-treasure-hunt.herokuapp.com/api/adv/status/' , { headers: { Authorization: token } } )

        .then(results => {
            let x = results.data
            items = results.data.inventory
            console.log( x )

            if ( x.inventory.length >= 5 ) {
                shop = true
                console.log( 'Going to the shop' )
                setTimeout( () => ( getInit( shop = true , items ) ) , 1000 )

            } else {
                shop = false
                console.log( 'No need to go to the shop' )
                setTimeout( () => ( getInit( shop = false , items ) ) , 1000 )

            }

            return results.data;
        })

        .catch( error => {
            console.log( error );

        });

};

const bfs = ( starting_room, destination_room , data , cooldown ) => {

    visited_rooms = data

    if ( starting_room === destination_room ) {
        return [ starting_room ];

    }

    visited = {};
    visited_path = {};
    queue = [];
    queue.unshift( [ [starting_room , 'start'] ] );

    while ( queue.length > 0 ) {
        
        path = queue.shift();
        last = path.length - 1;
        room = path[last][0];

        if ( ! ( room in visited ) ) {

            if ( visited_rooms[ room ] === undefined ) {
                null

            } else {

                for ( neighbor in visited_rooms[ room ].exits ) {

                    if ( ! ( visited_rooms[ room ].exits[ neighbor ] in visited ) ) {
                        path_new = [ ...path ];
                        path_new.push( [ visited_rooms[ room ].exits[neighbor] , neighbor ] );
                        queue.unshift( path_new );
                            
                        if ( visited_rooms[ room ].exits[ neighbor ] == destination_room ) {
                                
                            last = path_new.length - 1;
                            move( path_new , cooldown )
                            return visited_path[path_new[ last ][ 0 ] ] = path_new;

                        }
                    }
                }

                visited[ room ] = true;
            }

        }
    }

    return visited_path;

};


const move = async ( path , cooldown ) => {

    for ( i = 1; i < path.length; i++ ) {
    
        let step = path[ i ][ 1 ]
        let direction = { direction: step , next_room_id: path[ i ][ 0 ].toString() }
        console.log( 'Cooldown:' , cooldown )
        await timeout( cooldown * 1100 )

        await axios
            .post( 'https://lambda-treasure-hunt.herokuapp.com/api/adv/move/' , direction , { headers: { Authorization: `Token 799a4e295b4919d847477f5c72308f06b8284d99` }} )

            .then( res => {
                console.log( '------------ Room ID:' , res.data.room_id )
                items = res.data.items
                cooldown = res.data.cooldown

                if ( items.length >= 1 ) {
                    collectTreasure( items , cooldown )
                    i = path.length - 1

                }

            })

            .catch( error => {
                console.log( 'Move Error:' , error )

            })

    }
        
    console.log( 'Move Complete' )
    setTimeout( () => getInventory() , cooldown * 1000 )

}

const collectTreasure = async ( items , cooldown ) => {

    for ( i = 0; i < items.length; i++ ) {
        console.log( `collecting ${ items[i] }` )
        treasure = { name: items[ i ] }

        await timeout( cooldown * 1000 )
        await axios
            .post( 'https://lambda-treasure-hunt.herokuapp.com/api/adv/take/' , treasure , { headers: { Authorization: `Token 799a4e295b4919d847477f5c72308f06b8284d99` }} )

            .then( res => {
                console.log( `Collected: ${items[0]}` )
                cooldown = res.data.cooldown
                
            })

            .catch( error => {
                console.log( 'Treasure Error, (ignore for 15 seconds)' , error )

            })
    
    }

    console.log( 'No items left' )
    setTimeout( () => getInventory() , 15000 )
         
}

const sellTreasure = async ( items , cooldown ) => {

    cooldown = cooldown

    console.log( 'selling treasure' , items )
    
    for ( i = 0; i < items.length ; i++ ) {

        treasure = { name: items[ i ] , confirm: 'yes' }
        console.log( treasure )
        await timeout( cooldown * 10000 )

        await axios
            .post( 'https://lambda-treasure-hunt.herokuapp.com/api/adv/sell/' , treasure , { headers: { Authorization: `Token 799a4e295b4919d847477f5c72308f06b8284d99` }} )

            .then( res => {

                console.log( res.data )
                console.log( `Collected: ${item}` )
                cooldown = res.data.cooldown
                
            })

            .catch( error => {

                console.log( 'Sell Treasure Error' , error )

            })

    }

    setTimeout( () => getInventory() , 10000)

}

function timeout( ms ) {
    return new Promise( resolve => setTimeout( resolve , ms ) );

}


const readMap = ( init_room , cooldown ) => {

    fs.readFile( 'data.json' , ( err , info ) => {

        if ( error ) throw error;
        data = JSON.parse( info.toString() )
        let treasure_room = []
        let entire_map = []

        for (var i = 0; i < Object.keys( data ).length; i++) {

            if ( data[ Object.keys( data )[ i ] ].items === undefined || data[ Object.keys( data )[ i ] ].exits === undefined ) {
                null
            } else if ( data[ Object.keys( data )[ i ] ].items.includes( 'tiny treasure' ) || data[ Object.keys( data )[ i ] ].items.includes( 'small treasure' ) ) {

                treasure_room.push({ room: Object.keys( data )[ i ], exits: data[ Object.keys( data )[ i ] ].exits })

            }

            entire_map.push({ room: Object.keys( data )[ i ], exits: data[ Object.keys( data )[ i ] ].exits })

        }

        // Current Room
        let current_room = init_room

        //Closest Treasure
        // x = treasure_room[ 0 ].room

        // Ramdom Room
        x = Math.floor( Math.random() * 498 )

        if ( shop == false ) {

            destination_room =  Object.keys( data )[ x ] 
            // destination_room =  250
            console.log( `Going to room ${destination_room}` , data[ x ] )
            bfs( current_room , destination_room , data , cooldown )

        } else if ( shop == true ) {

            destination_room = 1
            bfs( current_room , destination_room , data , cooldown )

        }

    })

}

getInventory()