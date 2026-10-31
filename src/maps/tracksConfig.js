/**
 * tracksConfig.js - Configuraciones de los 3 Circuitos Oficiales de Micro-Volt RC
 */
import { SuburbanStreetMap } from './SuburbanStreetMap.js'
import { ToyRoomMap } from './ToyRoomMap.js'
import { DesertGrandPrixMap } from './DesertGrandPrixMap.js'

export const TRACK_CONFIGS = [
  {
    id: 'industrial-gp',
    index: 0,
    name: 'Distrito Industrial & Hangar',
    tag: 'CIRCUITO URBANO / HANGAR',
    desc: 'Circuito callejero e industrial con túnel de contenedores, puente elevado a 5 metros, asfalto de alta adherencia y chicana.',
    mapClass: SuburbanStreetMap,
    surface: 'Asfalto Industrial & Concreto',
    lengthM: 480,
    record: '00:26:150',
    svgPath: 'M 140,40 L 140,120 Q 140,150 110,150 L 50,150 Q 30,150 30,120 L 30,60 Q 30,40 50,40 L 110,40 Q 140,40 140,60 Z',
    spawnPosition: [38, 0.55, -80],
    spawnRotationY: 0, // Hacia +Z
  },
  {
    id: 'toy-workshop',
    index: 1,
    name: 'Bodega & Taller de Juguetes',
    tag: 'CIRCUITO MINIATURA 2 PISOS',
    desc: 'Escenario colosal estilo Micro Machines. Carrera bajo mesas gigantes, rampa de madera a la gran mesa de trabajo (4.5m) y descenso en curva.',
    mapClass: ToyRoomMap,
    surface: 'Parquet de Madera & Tablones',
    lengthM: 420,
    record: '00:24:820',
    svgPath: 'M 130,40 L 130,140 Q 130,165 100,165 L 45,165 Q 25,165 25,140 L 25,55 Q 25,35 50,35 L 105,35 Q 130,35 130,55 Z',
    spawnPosition: [25, 0.55, -50],
    spawnRotationY: 0, // Hacia +Z
  },
  {
    id: 'desert-gp',
    index: 2,
    name: 'Gran Premio del Desierto',
    tag: 'SUPER SPEEDWAY DEL DESIERTO',
    desc: 'Circuito profesional al aire libre entre cañones rocosos, curvas de alta velocidad con pianos rojo/blanco y recta principal de meta.',
    mapClass: DesertGrandPrixMap,
    surface: 'Asfalto de Competición & Curbs',
    lengthM: 550,
    record: '00:28:400',
    svgPath: 'M 100,30 L 155,75 Q 165,110 140,145 L 80,165 Q 40,155 35,120 L 35,65 Q 40,30 80,30 Z',
    spawnPosition: [0, 0.55, -120],
    spawnRotationY: 0, // Hacia +Z
  },
]
