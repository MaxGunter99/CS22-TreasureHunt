const axios = require("axios");
const fs = require("fs");

const bfs = ( starting_room , destination_room ) => {

    if ( starting_room === destination_room ) {
        return [ starting_room ];
    }

    visited = {};
    visited_path = {};
    queue = [];

    queue.unshift([ starting_room ]);

    while ( queue.length > 0 ) {
        path = queue.shift();
        last = path.length - 1;
        room = path[ last ];

        if ( ! ( room in visited ) ) {

            for ( neighbor in visited_rooms[ room ][ 'exits' ] ) {

                if ( ! ( visited_rooms[ room ][ 'exits' ][ neighbor ] in visited ) ) {
                    path_new = [ ...path ];
                    path_new.push( visited_rooms[ room ][ 'exits' ][ neighbor ] );
                    queue.unshift( path_new );

                    if ( visited_rooms[ room ][ 'exits' ][ neighbor ] === destination_room ) {
                        path_new.pop();
                        last = path_new.length - 1;
                        visited_path[ path_new[ last ] ] = path_new;

                    }
                }
            }

            visited[ room ] = true;
        }
    }

    return visited_path;
};

function timeout( ms ) {

    return new Promise( resolve => setTimeout( resolve, ms ) );

}

const convertPath = async ( id , path , current_room , time,  cb ) => {

    let min = Infinity;
    let newPath;

    for ( p in path ) {

        if ( min > path[ p ].length ) {
            min = path[ p ].length;
            newPath = path[ p ];
            console.log( 'New Path:' , newPath );
        }

    }

    for ( i = 0; i < newPath.length; i++ ) {

        if ( i !== 0 ) {

            for ( direction in visited_rooms[ current_room ][ 'exits' ] ) {
                console.log(
                    "here",
                    direction,
                    visited_rooms[ current_room ][ 'exits' ][ direction ],
                    visited_rooms[ current_room ][ 'exits' ][ direction ] === newPath[ i ]
                );

                if ( visited_rooms[ current_room ][ 'exits' ][ direction ] === newPath[ i ] ) {
                    console.log( 'Waiting . . .' , time );
                    await timeout( time );
                    room_data = await move( id , direction , newPath[ id ] );
                    current_room = room_data[ 'room_id' ];
                    time = room_data[ 'cooldown' ] * 1000;

                }
            }

            for ( e in visited_rooms[ current_room ][ 'exits' ] ) {
                if ( visited_rooms[ current_room ][ 'exits' ][ e ] === false) {
                    console.log( 'Moving Direction:', e );
                    setTimeout( () => cb( id , e , current_room ) , time );
                    break;
                }
            }
        }
    }
};

const getInit = id => {

    token = id;

    return axios
        .get( 'https://lambda-treasure-hunt.herokuapp.com/api/adv/init/' , { headers: { Authorization: token } } )

        .then( res => {
            return res.data;

        })

        .catch( error => {
            console.log( error );

        })
};

const move = ( id , direction , guess = false ) => {

    console.log( 'Guess:' , guess );
    const token = id;
    let data = { direction };

    if ( guess ) {
        data = { direction, next_room_id: String( guess ) };
    }

    return axios
        .post( 'https://lambda-treasure-hunt.herokuapp.com/api/adv/move/' , { headers: { Authorization: token } } , { data: data } )
        .then( res => {
            return res.data;

        })

        .catch( err => {
            console.log( err );

        });
};

const reverse = direction => {

    if ( direction === 'n' ) {
        return 's';

    } else if ( direction === 's' ) {
        return 'n';

    } else if ( direction === 'w' ) {
        return 'e';

    } else if ( direction === 'e' ) {
        return 'w';

    }
};

const travel = async ( id , direction , prevRoom_id , guess = false ) => {

    // if all rooms have been visited, traversal has been completed, will log time and then exit
    if ( Object.keys( visited_rooms ).length === 500 ) {
        console.log( 'All Rooms Visited' );
        return;

    }

    try {

        let room_data;

        // condition type of movement or guess
        if ( !direction ) {
            // beginning, get location and exits
            let rawdata = fs.readFileSync( 'data.json' );
            visited_rooms = JSON.parse( rawdata );
            console.time( 'Completed time' );
            room_data = await getInit( id );

        } else if ( typeof guess === 'number' ) {

            // move with guess 
            room_data = await move( id , direction , guess );
            visited_rooms[ prevRoom_id ][ 'exits' ][ direction ] = room_data[ 'room_id' ];

        } else {

            // move without guess, a new has been visited
            let data = JSON.stringify( visited_rooms );
            fs.writeFileSync( 'data.json' , data);
            room_data = await move( id , direction );
            visited_rooms[ prevRoom_id ][ 'exits' ][ direction ] = room_data[ 'room_id' ];

        }

        // logging the current room
        console.log( '\n' , room_data[ 'room_id' ] , '\n' );

        // setting up data to be recorded in visited if not invisited
        const current_room = room_data[ 'room_id' ];
        const time = room_data[ 'cooldown' ] * 1000;
        const items = room_data[ 'items' ];
        const exits = room_data[ 'exits' ];

        if ( ! ( current_room in visited_rooms ) ) {

            // if current room has not been visited it is added with associated data
            const roomExits = {};
            const title = room_data[ 'title' ];
            const description = room_data[ 'description' ];
            const elevation = room_data[ 'elevation' ];
            const terrain = room_data[ 'terrain' ];
            const errors = room_data[ 'errors' ];
            const messages = room_data[ 'messages' ];

            // setting exits to false
            for ( e in exits ) {
                roomExits[ exits[ e ] ] = false;
            }

            // updateing visited rooms
            visited_rooms[ current_room ] = {
                exits: roomExits,
                items,
                title,
                description,
                elevation,
                terrain,
                errors,
                messages
            };

            // setting exit just entered from to previous room id just came froom
            if ( typeof prevRoom_id === 'number' ) {

                visited_rooms[ current_room ][ 'exits' ][ reverse( direction ) ] = prevRoom_id;

            }
        }

        // variables to determine how to move
        let moved = false;
        let min = Infinity;

        // if room has one exit, it is a dead end and will go back to previous room
        if ( exits.length === 1 && visited_rooms[ current_room ][ 'exits' ][ exits[ 0 ] ]) {

            setTimeout( () => travel( id , exits[ 0 ] , current_room , visited_rooms[ current_room ][ 'exits' ][ exits[ 0 ] ] ), time );
            moved = true;

        }

        // if room has an exit to a room that has not been visited  it will move to that room
        if ( !moved ) {
            for ( e in visited_rooms[ current_room ][ 'exits' ] ) {
                if ( visited_rooms[ current_room ][ 'exits' ][ e ] === false ) {

                    console.log( 'Moving:' , e );
                    moved = true;
                    setTimeout( () => travel( id , e , current_room ) , time );
                    break;

                }
            }

            // if all exits have been visited it will go to the room with the smallest id
            if ( !moved ) {
                for ( e in visited_rooms[ current_room ][ 'exits' ] ) {
                    if ( min > visited_rooms[ current_room ][ 'exits' ][ e ]) {
                        min = visited_rooms[ current_room ][ 'exits' ][ e ];

                    }
                }
            }
        }

        // this is a safty function just in case player starts south of room 0 and has not visited north room 0
        if ( current_room === 0 && min === 1 ) {
            const rooms = bfs( 0 , false );
            convertPath( id , rooms , current_room , time , travel );
            moved = true;
        }

        // if min is not infinity and is an id it will move to that room with guess of that id
        if ( !moved ) {
            console.log( 'Move to the smallest ID:' , min );
            for ( e in visited_rooms[ current_room ][ 'exits' ] ) {
                if ( visited_rooms[ current_room ][ 'exits' ][ e ] == min ) {
                    console.log( 'Direction:' , e );
                    setTimeout( () => travel( id , e , current_room , min ) , time );
                    break;

                }
            }
        }
    } catch ( error ) {
        console.log( error );
    }
};

let visited_rooms = {};
let id = "Token 799a4e295b4919d847477f5c72308f06b8284d99";
setTimeout( () => travel( id ) , 2653 );
