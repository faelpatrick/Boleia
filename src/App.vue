<script setup>
import { ref, onMounted } from "vue";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import {
  loginGoogle,
  listenAuth,
  updateUserPos,
  listenUsers
} from "./firebase";

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

  // Ler posições de todos os usuários em tempo real
  listenUsers((users) => {
    Object.keys(users).forEach((uid) => {
      const u = users[uid];
      // Cor diferente para o próprio usuário
      let markerColor = "green";
      if (u.tipo === "motorista") markerColor = "green";
      if (uid === user.value?.uid) markerColor = "red";

      if (!markers[uid]) {
        markers[uid] = new maplibregl.Marker({
          color: markerColor
        })
          .setLngLat([u.lng, u.lat])
          .addTo(map);
      } else {
        markers[uid].setLngLat([u.lng, u.lat]);
        // Atualiza cor se necessário
        if (markers[uid]._color !== markerColor) {
          markers[uid]._color = markerColor;
        }
      }
    });
    console.log('Usuários atualizados:', users);
  });
});
</script>
<template>
  <v-container class="pa-4">

    <v-row justify="center" v-if="!user">
      <v-btn color="primary" @click="fazerLogin">
        Entrar com Google
      </v-btn>
    </v-row>

    <v-row justify="center" class="mt-4" v-if="user && !tipo">
      <v-btn color="blue" class="ma-2" @click="escolherTipo('motorista')">
        Oferecer boleia
      </v-btn>

      <v-btn color="green" class="ma-2" @click="escolherTipo('passageiro')">
        Quero boleia
      </v-btn>
    </v-row>

  </v-container>

  <!-- MAPA FORA DO V-CONTAINER -->
  <div id="map" class="map-container"></div>
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
