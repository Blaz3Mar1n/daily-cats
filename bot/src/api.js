import fetch from 'node-fetch';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const API_SECRET  = process.env.API_SECRET;

const headers = { 
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${API_SECRET}`,
};

export async function postCat({ day, name, title, gif_url, sender_id, sender_name, avatar_url }) {
  try {
    const res = await fetch(`${BACKEND_URL}/cats`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ day, name, title, gif_url, sender_id, sender_name, avatar_url }),
    });
    const data = await res.json();
    if (res.status === 409) return { skipped: true, existing: data };
    if (!res.ok) { console.error(`❌ Backend error ${res.status}:`, data); return { error: data }; }
    return { success: true, cat: data };
  } catch (err) {
    console.error('❌ Failed to reach backend:', err.message);
    return { error: err.message };
  }
}

export async function patchCatGif(id, gif_url) {
  try {
    const res = await fetch(`${BACKEND_URL}/cats/${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ gif_url }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
