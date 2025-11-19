<script setup>
import { ref, onMounted } from "vue";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import {
  loginGoogle,
  listenAuth,
  updateUserPos,
  db
} from "./firebase";
import { ref as dbRef, get } from "firebase/database";

const user = ref(null);
const tipo = ref(null); // "motorista" ou "passageiro"

let map;
const markers = {};

// Recupera login automaticamente ao recarregar a página
listenAuth((u) => {
  user.value = u;
});

// Login manual
async function fazerLogin() {
  try {
    await loginGoogle();
  } catch (e) {
    console.error(e);
  }
}

// Escolher tipo (mostra no mapa)
function escolherTipo(t) {
  tipo.value = t;
  console.log('Tipo escolhido:', t);
  // Aguarda o mapa estar pronto antes de iniciar localização
  if (map) {
    iniciarLocalizacao();
  } else {
    // Se o mapa ainda não estiver pronto, aguarda onMounted
    const waitMap = setInterval(() => {
      if (map) {
        clearInterval(waitMap);
        iniciarLocalizacao();
      }
    }, 100);
  }
}

// Enviar localização continuamente
function iniciarLocalizacao() {
  if (!user.value) return;

  navigator.geolocation.watchPosition((pos) => {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;

    updateUserPos(user.value.uid, lat, lng, tipo.value);

    // Centraliza o mapa na posição do usuário
    if (map) {
      map.setCenter([lng, lat]);
    }
  });
}

onMounted(() => {
  map = new maplibregl.Map({
    container: "map",
    style: {
      version: 8,
      sources: {
        osm: {
          type: "raster",
          tiles: [
            "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
            "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
            "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png"
          ],
          tileSize: 256,
          attribution: "© OpenStreetMap"
        }
      },
      layers: [
        {
          id: "osm",
          type: "raster",
          source: "osm",
          minzoom: 0,
          maxzoom: 19
        }
      ]
    },
    center: [-8.381062, 41.602987],
    zoom: 14
  });

  async function atualizarMarcadores() {
    const snap = await get(dbRef(db, "users"));
    const users = snap.val() || {};

    // Remove marcadores de usuários que saíram
    Object.keys(markers).forEach((uid) => {
      if (!users[uid] || !users[uid].tipo) {
        markers[uid].remove();
        delete markers[uid];
      }
    });

    Object.keys(users).forEach((uid) => {
      const u = users[uid];
      // Só mostra quem tem tipo definido
      if (!u.tipo) return;

      let markerColor = "green";
      if (u.tipo === "passageiro") markerColor = "#0093ac";
      if (uid === user.value?.uid) markerColor = "red";

      // Extrair primeiro e último nome
      let nome = u.displayName;
      // Se for o usuário logado e não houver displayName salvo, usa o local
      if (!nome && uid === user.value?.uid && user.value?.displayName) {
        nome = user.value.displayName;
      }
      if (!nome) nome = "";
      const partes = nome.trim().split(" ");
      if (partes.length > 1) {
        nome = partes[0] + " " + partes[partes.length - 1];
      } else {
        nome = partes[0];
      }

      // Criar elemento com nome acima do marker padrão
      let wrapper, label, markerEl;
      if (!markers[uid]) {
        wrapper = document.createElement('div');
        wrapper.style.display = 'flex';
        wrapper.style.flexDirection = 'column';
        wrapper.style.alignItems = 'center';
        wrapper.style.pointerEvents = 'none';

        label = document.createElement('span');
        label.innerText = nome;
        label.style.color = '#0093ac';
        label.style.fontWeight = 'bold';
        label.style.fontSize = '12px';
        label.style.marginBottom = '2px';
        label.style.background = 'white';
        label.style.padding = '1px 6px';
        label.style.borderRadius = '8px';
        label.style.boxShadow = '0 1px 4px #0002';
        label.style.pointerEvents = 'auto';

        wrapper.appendChild(label);

        // Cria o marker padrão manualmente
        markerEl = document.createElement('div');
        markerEl.className = 'custom-marker-dot';
        markerEl.style.width = '24px';
        markerEl.style.height = '24px';
        markerEl.style.borderRadius = '50%';
        markerEl.style.background = markerColor;
        markerEl.style.border = '2px solid #fff';
        markerEl.style.boxShadow = '0 1px 4px #0004';
        markerEl.style.pointerEvents = 'auto';
        wrapper.appendChild(markerEl);

        markers[uid] = new maplibregl.Marker({ element: wrapper, anchor: 'bottom' })
          .setLngLat([u.lng, u.lat])
          .addTo(map);
        markers[uid]._color = markerColor;
        markers[uid]._label = label;
        markers[uid]._markerEl = markerEl;
      } else {
        markers[uid].setLngLat([u.lng, u.lat]);
        // Atualiza cor e nome se necessário
        if (markers[uid]._color !== markerColor) {
          markers[uid]._markerEl.style.background = markerColor;
          markers[uid]._color = markerColor;
        }
        if (markers[uid]._label.innerText !== nome) {
          markers[uid]._label.innerText = nome;
        }
      }
    });
    //console.log('Usuários atualizados:', users);
  }

  atualizarMarcadores();
  setInterval(atualizarMarcadores, 5000);
});
import { auth } from "./firebase";
import { signOut } from "firebase/auth";

async function fazerLogout() {
  try {
    await signOut(auth);
    tipo.value = null;
  } catch (e) {
    console.error("Erro ao sair:", e);
  }
}
</script>
<template>
  <v-container class="pa-4">

    <v-row justify="center" v-if="!user">
      <v-btn color="primary" @click="fazerLogin">
        Entrar com Google
      </v-btn>
    </v-row>

    <v-row justify="center" class="mt-4" v-if="user && !tipo">
      <v-btn color="green" class="ma-2" @click="escolherTipo('motorista')">
        Oferecer boleia
      </v-btn>

      <v-btn style="background-color: #0093ac; color: #fff;" class="ma-2" @click="escolherTipo('passageiro')">
        Quero boleia
      </v-btn>
    </v-row>

  </v-container>

  <!-- MAPA FORA DO V-CONTAINER -->
  <div id="map" class="map-container"></div>

  <v-row justify="center" class="mt-4" v-if="user">
    <div>
      <p>Logado como: {{ user.displayName }} ({{ tipo || 'Tipo não selecionado' }})</p>
    </div>
  </v-row>
  <!-- botao de logoff logout sair -->

  <v-row justify="center" class="mt-4" v-if="user">
    <v-btn color="red" class="ma-2" @click="fazerLogout">
      Sair
    </v-btn>
  </v-row>

</template>

<style>
.map-container {
  width: 100%;
  height: 500px;
  min-height: 500px;
  background: #ddd;
  border-radius: 10px;
  position: relative;
  z-index: 1;
}
</style>
