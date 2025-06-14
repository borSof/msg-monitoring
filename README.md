**===================== Prerequisites – Install Dependencies (Linux/Ubuntu)**

# Update your package list
sudo apt update

# Install Node.js (LTS, e.g., 18.x or 20.x)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Check versions
node -v
npm -v

# Install MongoDB Community Edition
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt update
sudo apt install -y mongodb-org

# Start and enable MongoDB as a service
sudo systemctl start mongod
sudo systemctl enable mongod

# Verify MongoDB is running
mongo --eval 'db.runCommand({ connectionStatus: 1 })'

# Install Git
sudo apt install -y git

# (Optional) Install PM2 (Node.js process manager) globally
sudo npm install -g pm2

**================================ 2. Clone the Repository**

git clone https://github.com/borSof/msg-monitoring.git
cd msg-monitoring

**3. ============================= 3.Backend Setup (server)**

cd server
npm install
cp .env.example .env

    Edit your .env file:
MONGO_USER=****
MONGO_PASS=****
MONGO_AUTH_SOURCE=****
MONGO_URL=***
HUGGINGFACE_API_TOKEN=hf_T…
JWT_SECRET=*****

**================================ 4. Start MongoDB**
    If using systemd (as a service):
sudo systemctl start mongod

Or, with Docker (optional):
docker run -d -p 27017:27017 --name mongo mongo

Verify MongoDB is running:
    mongo --eval 'db.runCommand({ connectionStatus: 1 })'

**================================ 5. Start the Backend
    For development:
      npm start

    For production (recommended):
      npm install -g pm2
      pm2 start app.js --name server
      pm2 logs server

**================================ 6. Frontend Setup (ui)
cd ../ui
npm install
    (Optional): If your backend is not running on localhost:3000,
    edit next.config.js to update the proxy/rewrite settings accordingly.
**================================ 7. Start the Frontend
    For development:
      npm run dev    # default port: 3001

For production:
npm run build
npm run start  # default port: 3001 (use: npm run start -- -p 4000 for a different port)

Open your browser:
http://localhost:3001 or http://VM_IP_HERE:3001 if you are on a VM

**================================ 8. Default Login (First User Creation)
Important:
By default, there are no users after installation.
You must manually create an admin user in MongoDB shell:

use msg-monitoring
db.users.insertOne({
  username: "admin",
  passwordHash: "<bcrypt-hash>",
  role: "admin",
  active: true
})

How to generate a password hash:
    Use an online bcrypt generator
    OR generate one in Node.js REPL:

require('bcrypt').hashSync('YOUR_PASSWORD', 10)
(Start Node.js REPL with node in your terminal.)
   
