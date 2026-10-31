# Arquitectura y Reglas del Proyecto: Micro-Volt RC

## Visión General
**Micro-Volt RC** es un videojuego de carreras arcade 3D de autos a control remoto miniatura en escenarios gigantes (estilo Micro Machines / Re-Volt), desarrollado con Three.js, cannon-es y Vite.

---

## 1. Stack Tecnológico
- **Motor Gráfico:** Three.js.
- **Motor Físico:** cannon-es (`CANNON.RaycastVehicle`).
- **Bundler y Servidor de Desarrollo:** Vite.

---

## 2. Reglas Físicas Críticas de cannon-es

> [!CAUTION]
> **Colisiones con `CANNON.Trimesh`:**
> `CANNON.Trimesh` **SOLO colisiona con esferas (`CANNON.Sphere`) y planos (`CANNON.Plane`)**. No colisiona de forma confiable con `CANNON.Box` u otras formas compuestas trimesh-a-trimesh / trimesh-a-box.

1. **Chasis del Vehículo:**
   - Para que el chasis del auto colisione correctamente con rampas, pistas y objetos basados en `Trimesh`, **debe tener 4 esferas incrustadas en las esquinas** además de la caja delimitadora principal (`CANNON.Box`).
2. **Actualización de Cuerpos Estáticos:**
   - Después de posicionar, rotar o transformar cualquier cuerpo físico estático (rampas, obstáculos, muebles, bordes de pista), **es OBLIGATORIO llamar a `body.updateAABB()`** para recalcular su volumen delimitador en el árbol de colisiones.

---

## 3. Modularidad y Organización del Código

> [!IMPORTANT]
> **Prohibido borrar código funcional.** Toda nueva funcionalidad debe desarrollarse de manera modular y desacoplada respetando la siguiente estructura de carpetas:

- `src/vehicles/`: Controladores de vehículos, físicas, suspensión, configuración de ruedas y colisiones del chasis (`CANNON.RaycastVehicle`).
- `src/maps/`: Carga de escenarios gigantes, pistas, rampas, colisionadores estáticos (`Trimesh`/`Box`/`Plane`) y utilidades de circuito.
- `src/ai/`: Controladores de bots e IA contrincante (waypoint navigation, steering, evitación de obstáculos).
- `src/items/`: Power-ups, armas, baterías, turbos y coleccionables arcade tipo Re-Volt / Mario Kart.
- `src/ui/`: Interfaz de usuario (HUD, velocímetro, posiciones de carrera, minimapa, menú de selección de autos).
- `src/asset-manifest.json`: Inventario canónico de modelos 3D disponibles en `public/assets/packs/` (PROHIBIDO inventar o adivinar nombres de archivos de modelos).

---

## 4. Flujo de Desarrollo y Buenas Prácticas
1. **Modelos 3D:** Solo utilizar rutas verificadas en `src/asset-manifest.json`.
2. **Pruebas y Verificación:** Antes de avanzar a cada fase, verificar que el proyecto compile sin errores (`npm run build` o validación en navegador/Vite).
