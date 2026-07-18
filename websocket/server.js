require('dotenv').config();
const WebSocket = require('ws');
const http = require('http');
const axios = require('axios');

// Configuration
const PORT = process.env.PORT || 3001;
const API_KEY = process.env.WS_API_KEY || 'votre-cle-api-websocket-2024';
const LARAVEL_API_URL = process.env.LARAVEL_API_URL || 'http://127.0.0.1:9000/api';

console.log('Api key :', API_KEY);
// Créer le serveur HTTP
const server = http.createServer((req, res) => {
  // Health check endpoint
  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'ok', 
      connections: clients.size,
      timestamp: new Date().toISOString()
    }));
    return;
  }

  // Broadcast endpoint
  if (req.url === '/broadcast' && req.method === 'POST') {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      // Vérifier l'API key
      const apiKey = req.headers['x-api-key'];
      if (apiKey !== API_KEY) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }

      try {
        const { hotelId, event, data } = JSON.parse(body);
        
        // Broadcast aux clients de cet hôtel
        broadcastToHotel(hotelId, event, data);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end();
});

// Créer le serveur WebSocket
const wss = new WebSocket.Server({ server });

// Stocker les clients connectés par hôtel
const clients = new Map(); // userId -> { ws, hotelId, userId }

// Fonction pour vérifier le token Sanctum avec Laravel
async function verifyToken(token) {
  try {
    console.log('🔍 Verifying token with Laravel API...');
    console.log('📤 Token to verify (first 50 chars):', token.substring(0, 50));
    
    // IMPORTANT: La fonction verifyToken s'attend à recevoir le token SANS "Bearer "
    const cleanToken = token.replace(/^Bearer\s+/i, '');
    
    const response = await axios.get(`${LARAVEL_API_URL}/user`, {
      headers: {
        'Authorization': `Bearer ${cleanToken}`,
        'Accept': 'application/json'
      }
    });
    
    if (response.status === 200 && response.data) {
      console.log('✅ Token verified, user ID:', response.data.id);
      return response.data;
    }
    
    return null;
  } catch (error) {
    console.error('❌ Token verification failed:', error.response?.status, error.response?.data || error.message);
    return null;
  }
}
/*
// Fonction pour broadcaster à un hôtel
function broadcastToHotel(hotelId, event, data) {
  let count = 0;
  clients.forEach((client) => {
    if (client.hotelId == hotelId && client.ws.readyState == WebSocket.OPEN) {
      client.ws.send(JSON.stringify({
        type: event,
        ...data
      }));
      count++;
    }
  });
  console.log(`📡 Broadcasted ${event} to ${count} clients in hotel ${hotelId}`);
}*/

// Fonction pour broadcaster à un hôtel
function broadcastToHotel(hotelId, event, data) {
  console.log('\n🔍 === BROADCAST DIAGNOSTIC START ===');
  console.log(`📤 Received broadcast request:`);
  console.log(`  - hotelId: "${hotelId}" (type: ${typeof hotelId})`);
  console.log(`  - event: "${event}"`);
  console.log(`  - has data: ${!!data}`);
  console.log(`  - has notification: ${!!data?.notification}`);
  
  let count = 0;
  
  console.log('\n👥 Checking all connected clients:');
  console.log(`Total clients: ${clients.size}`);
  
  if (clients.size === 0) {
    console.log('❌ NO CLIENTS CONNECTED AT ALL');
  }
  
  clients.forEach((client, userId) => {
    console.log(`\n👤 Client ${userId}:`);
    console.log(`  - hotelId: "${client.hotelId}" (type: ${typeof client.hotelId})`);
    console.log(`  - user email: ${client.user?.email || 'N/A'}`);
    console.log(`  - ws readyState: ${client.ws.readyState} (${client.ws.readyState === WebSocket.OPEN ? 'OPEN ✅' : 'NOT OPEN ❌'})`);
    console.log(`  - Comparison: client.hotelId (${client.hotelId}) == hotelId (${hotelId}) = ${client.hotelId == hotelId}`);
    console.log(`  - Both conditions: ${client.hotelId == hotelId && client.ws.readyState === WebSocket.OPEN ? 'MATCH ✅' : 'NO MATCH ❌'}`);
    
    if (client.hotelId == hotelId && client.ws.readyState === WebSocket.OPEN) {
      console.log(`✅ SENDING to client ${userId}...`);
      try {
        client.ws.send(JSON.stringify({
          type: event,
          ...data
        }));
        count++;
        console.log(`✅ Sent successfully to client ${userId}`);
      } catch (error) {
        console.error(`❌ Error sending to client ${userId}:`, error.message);
      }
    }
  });
  
  console.log(`\n📡 RESULT: Broadcasted ${event} to ${count} clients in hotel ${hotelId}`);
  
  // Log supplémentaire pour vérifier la structure des données
  if (data?.notification) {
    console.log('\n📩 Notification details being sent:');
    console.log(`  - ID: ${data.notification.id}`);
    console.log(`  - Type: ${data.notification.type}`);
    console.log(`  - Title: ${data.notification.title}`);
    console.log(`  - User ID: ${data.notification.user_id}`);
  }
  
  console.log('=== BROADCAST DIAGNOSTIC END ===\n');
}




// Gérer les connexions WebSocket
wss.on('connection', (ws) => {
  console.log('🔌 New WebSocket connection');
  let clientId = null;

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message.toString());
      
      switch (data.type) {
        case 'auth':
          console.log('🔑 Authentication attempt...');
          console.log('📝 Token received (first 50 chars):', data.token ? data.token.substring(0, 50) : 'NO TOKEN');
          console.log('📏 Token length:', data.token ? data.token.length : 0);
          
          if (!data.token) {
            console.error('❌ No token provided');
            ws.send(JSON.stringify({
              type: 'auth_error',
              message: 'No token provided'
            }));
            ws.close();
            return;
          }

          // Vérifiez le format du token
          if (!data.token.startsWith('Bearer ')) {
            console.log('⚠️ Token does not start with "Bearer ", adding it');
            data.token = 'Bearer ' + data.token;
          }
          
          // AJOUTEZ CE LOG POUR VOIR CE QUI EST ENVOYÉ À verifyToken
          console.log('📤 Sending to verifyToken (first 60 chars):', data.token.substring(0, 60));
          
          const user = await verifyToken(data.token);
          
          if (!user) {
            console.error('❌ Invalid token');
            ws.send(JSON.stringify({
              type: 'auth_error',
              message: 'Invalid token'
            }));
            ws.close();
            return;
          }

          clientId = user.id.toString();
          clients.set(clientId, {
            ws,
            userId: clientId,
            hotelId: null,
            user: user
          });
          
          ws.send(JSON.stringify({
            type: 'auth_success',
            userId: clientId
          }));
          
          console.log(`✅ Client ${clientId} (${user.email}) authenticated successfully`);
          break;

        case 'subscribe_hotel':
          if (clientId && clients.has(clientId)) {
            const client = clients.get(clientId);
            console.log(`\n🏨 === SUBSCRIBE_HOTEL DETAILS ===`);
    console.log(`  - Client ID: ${clientId}`);
    console.log(`  - Old hotelId: "${client.hotelId}" (type: ${typeof client.hotelId})`);
    console.log(`  - New hotelId: "${data.hotelId}" (type: ${typeof data.hotelId})`);
    console.log(`  - User email: ${client.user?.email}`);
            client.hotelId = data.hotelId;

             console.log(`  - Updated hotelId: "${client.hotelId}" (type: ${typeof client.hotelId})`);
    console.log(`=== END SUBSCRIBE DETAILS ===\n`);
            
            ws.send(JSON.stringify({
              type: 'subscribed',
              hotelId: data.hotelId
            }));
            
            console.log(`🏨 Client ${clientId} subscribed to hotel ${data.hotelId}`);
          } else {
            console.warn('⚠️  Unauthorized subscribe attempt');
          }
          break;

        case 'ping':
          ws.send(JSON.stringify({ type: 'pong' }));
          break;

        default:
          console.log(`❓ Unknown message type: ${data.type}`);
      }
    } catch (error) {
      console.error('💥 Error handling message:', error);
    }
  });

  ws.on('close', () => {
    if (clientId && clients.has(clientId)) {
      const client = clients.get(clientId);
      console.log(`👋 Client ${clientId} disconnected`);
      clients.delete(clientId);
    }
  });

  ws.on('error', (error) => {
    console.error('💥 WebSocket error:', error);
  });
});

// Démarrer le serveur
server.listen(PORT, () => {
  console.log('🚀 WebSocket server running');
  console.log(`   Port: ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Broadcast: http://localhost:${PORT}/broadcast`);
  console.log(`   Laravel API: ${LARAVEL_API_URL}`);
});

// Gérer l'arrêt gracieux
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

function shutdown() {
  console.log('\n🛑 Shutting down gracefully...');
  wss.close(() => {
    server.close(() => {
      console.log('✅ Server closed');
      process.exit(0);
    });
  });
}