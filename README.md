📡 Message Monitoring System

Интелигентна система за мониторинг и администриране на междусистемни съобщения (XML/JSON).
Обработва съобщения чрез конфигурируеми правила, AI класификация и RBAC контрол. Включва REST API, уеб интерфейс (Next.js + Chakra UI) и webhook интеграции.
⚙️ 1. Prerequisites (Linux/Ubuntu)

# Update your package list
sudo apt update

# Install Node.js (v20.x LTS)
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

# Start MongoDB as a service
sudo systemctl start mongod
sudo systemctl enable mongod

# Verify MongoDB is running
mongo --eval 'db.runCommand({ connectionStatus: 1 })'

# Git (if not installed)
sudo apt install -y git

# PM2 (optional, for production)
sudo npm install -g pm2

📥 2. Clone the Repository

git clone https://github.com/borSof/msg-monitoring.git
cd msg-monitoring

🔧 3. Backend Setup (server/)

cd server
npm install
cp .env.example .env

Edit .env:

MONGO_USER=your_user
MONGO_PASS=your_pass
MONGO_AUTH_SOURCE=admin
MONGO_URL=mongodb://localhost:27017/msg-monitoring
HUGGINGFACE_API_TOKEN=hf_...
JWT_SECRET=your_jwt_secret

🟢 4. Start MongoDB

sudo systemctl start mongod

Alternatively (Docker):

docker run -d -p 27017:27017 --name mongo mongo

🚀 5. Start the Backend
Development:

npm start

Production (with PM2):

pm2 start app.js --name server
pm2 logs server

🎨 6. Frontend Setup (ui/)

cd ../ui
npm install

If backend runs on different host/port:
Edit next.config.js proxy rewrites accordingly.
🌐 7. Start the Frontend
Development:

npm run dev   # Port 3001

Production:

npm run build
npm run start

    Access at: http://localhost:3001 or http://<YOUR_VM_IP>:3001

👤 8. Create First Admin User (Mongo Shell)

use msg-monitoring
db.users.insertOne({
  username: "admin",
  passwordHash: "<bcrypt-hash>",
  role: "admin",
  active: true
})

To generate a password hash:

// Inside Node.js REPL
require('bcrypt').hashSync('your_password', 10)

🛠️ Useful Scripts
Health check

curl http://localhost:3000/

Send XML message

curl -X POST http://localhost:3000/api/messages \
  -H "Content-Type: application/xml" \
  -d '<msg><text>hello</text></msg>'

🔐 Admin Interface

    /login — JWT login

    /messages, /maybe, /rules — dynamic UI with RBAC

    /status — live backend & MongoDB info

    /users, /roles, /fields, /channels — admin tools

🧠 AI Classification

Optional AI tagging using HuggingFace API. Configurable in UI or .env.
Uses facebook/bart-large-mnli model by default.
