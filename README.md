### Getting sources and install node modules

    git clone https://github.com/superBorys/bustabit_gameserver_custom
    cd bustabit_gameserver_custom
    npm install

### Populate GameHashes with Random seed

Open `bustabit_gameserver_custom/populate_hashes.js`  
Change `serverSeed = 'DO NOT USE THIS SEED';`

- Run below command to create hashes  

    `node bustabit_gameserver_custom/populate_hashes.js`

Wait till it finish to 100% and stop after it print **Finished with serverseed: xxxxxxxxxx**

### Start locally

    npm start

    It will run game server on 127.0.0.1:3842


### on server

mkdir logs
forever start -o logs/out.log -e logs/err.log server.js