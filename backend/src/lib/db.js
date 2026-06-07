const fs = require('fs');
const path = require('path');
const axios = require('axios');

const LOCAL_DB_PATH = path.join(__dirname, '../../data/db.json');
const FIREBASE_DB_URL = process.env.FIREBASE_DATABASE_URL || 'https://affilate-amz-default-rtdb.firebaseio.com';

// Ensure the local database file exists with initial structure
function initLocalDb() {
  const dir = path.dirname(LOCAL_DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(LOCAL_DB_PATH)) {
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify({
      products: {},
      clicks: {},
      categories: {},
      brands: {},
      banners: {},
      subscribers: {},
      users: {},
      adminLogs: {}
    }, null, 2));
  }
}

initLocalDb();

// Load the local database
function loadLocalData() {
  try {
    const raw = fs.readFileSync(LOCAL_DB_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading local db.json:', err);
    return {
      products: {},
      clicks: {},
      categories: {},
      brands: {},
      banners: {},
      subscribers: {},
      users: {},
      adminLogs: {}
    };
  }
}

// Save local database content
function saveLocalData(data) {
  try {
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving local db.json:', err);
  }
}

// Helper to check if Firebase is configured (e.g. not using a mock or default template key)
function isFirebaseActive() {
  return process.env.FIREBASE_DATABASE_URL && 
         !process.env.FIREBASE_DATABASE_URL.includes('YOUR_FIREBASE');
}

/**
 * DB Reference Object mimicking Firebase RTDB Ref interface
 */
class DbRef {
  constructor(nodePath) {
    // Normalize path: remove leading and trailing slashes
    this.path = nodePath.replace(/^\/|\/$/g, '');
  }

  async get() {
    if (isFirebaseActive()) {
      try {
        const url = `${FIREBASE_DB_URL}/${this.path}.json`;
        const res = await axios.get(url);
        if (res.data !== null) {
          return res.data;
        }
      } catch (err) {
        console.warn(`Firebase read failed at "${this.path}", falling back to local database. Error:`, err.message);
      }
    }

    // Local DB Fallback
    const localData = loadLocalData();
    if (!this.path) return localData;

    const parts = this.path.split('/');
    let target = localData;
    for (const part of parts) {
      if (target && typeof target === 'object') {
        target = target[part];
      } else {
        return null;
      }
    }
    return target !== undefined ? target : null;
  }

  async set(value) {
    // Save locally first
    const localData = loadLocalData();
    if (!this.path) {
      saveLocalData(value);
    } else {
      const parts = this.path.split('/');
      let target = localData;
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!target[part] || typeof target[part] !== 'object') {
          target[part] = {};
        }
        target = target[part];
      }
      target[parts[parts.length - 1]] = value;
      saveLocalData(localData);
    }

    // Synchronize to Firebase if configured
    if (isFirebaseActive()) {
      try {
        const url = `${FIREBASE_DB_URL}/${this.path}.json`;
        await axios.put(url, value);
      } catch (err) {
        console.error(`Firebase write failed at "${this.path}":`, err.message);
      }
    }

    return value;
  }

  async update(value) {
    const localData = loadLocalData();
    if (!this.path) {
      Object.assign(localData, value);
      saveLocalData(localData);
    } else {
      const parts = this.path.split('/');
      let target = localData;
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!target[part] || typeof target[part] !== 'object') {
          target[part] = {};
        }
        target = target[part];
      }
      const lastKey = parts[parts.length - 1];
      if (!target[lastKey] || typeof target[lastKey] !== 'object') {
        target[lastKey] = {};
      }
      Object.assign(target[lastKey], value);
      saveLocalData(localData);
    }

    if (isFirebaseActive()) {
      try {
        const url = `${FIREBASE_DB_URL}/${this.path}.json`;
        await axios.patch(url, value);
      } catch (err) {
        console.error(`Firebase patch failed at "${this.path}":`, err.message);
      }
    }

    return value;
  }

  async push(value) {
    const generatedId = 'id_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    
    // Add generated id to value if it's an object
    if (value && typeof value === 'object') {
      value.id = generatedId;
    }

    const localData = loadLocalData();
    let parent = localData;
    if (this.path) {
      const parts = this.path.split('/');
      for (const part of parts) {
        if (!parent[part] || typeof parent[part] !== 'object') {
          parent[part] = {};
        }
        parent = parent[part];
      }
    }
    parent[generatedId] = value;
    saveLocalData(localData);

    if (isFirebaseActive()) {
      try {
        const url = `${FIREBASE_DB_URL}/${this.path}/${generatedId}.json`;
        await axios.put(url, value);
      } catch (err) {
        console.error(`Firebase push failed at "${this.path}":`, err.message);
      }
    }

    return { key: generatedId, value };
  }

  async remove() {
    const localData = loadLocalData();
    if (!this.path) {
      saveLocalData({});
    } else {
      const parts = this.path.split('/');
      let target = localData;
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (target && typeof target === 'object') {
          target = target[part];
        }
      }
      const lastKey = parts[parts.length - 1];
      if (target && typeof target === 'object') {
        delete target[lastKey];
      }
      saveLocalData(localData);
    }

    if (isFirebaseActive()) {
      try {
        const url = `${FIREBASE_DB_URL}/${this.path}.json`;
        await axios.delete(url);
      } catch (err) {
        console.error(`Firebase delete failed at "${this.path}":`, err.message);
      }
    }

    return true;
  }
}

module.exports = {
  ref: (path) => new DbRef(path)
};
