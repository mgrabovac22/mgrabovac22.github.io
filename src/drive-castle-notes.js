import * as THREE from 'three';
import { RaycastResult, Vec3 } from 'cannon-es';
import { keepCollision, keepLevel } from './drive-castle-keep.js';

const desks = [
  { x: -3.42, z: -6.69, floor: 0, yaw: 0, desk: true },
  { x: 4.46, z: 10.54, floor: 0, yaw: Math.PI },
  { x: -10.52, z: -4.65, floor: 0, yaw: Math.PI / 2 },
  { x: 3.42, z: 6.35, floor: 1, yaw: Math.PI, desk: true },
  { x: -5.28, z: 3.85, floor: 1, yaw: Math.PI / 2 },
  { x: 4.48, z: -10.52, floor: 1, yaw: 0 },
  { x: 10.52, z: -4.67, floor: 1, yaw: -Math.PI / 2 },
  { x: -13.64, z: 12.81, floor: 1, yaw: Math.PI / 2, desk: true },
  { x: -3.42, z: 6.35, floor: 2, yaw: Math.PI, desk: true, paper: true },
  { x: -10.52, z: 3.76, floor: 2, yaw: Math.PI / 2 },
  { x: 4.39, z: -10.52, floor: 2, yaw: 0 },
  { x: 13.88, z: -13.88, floor: 2, yaw: -.75, desk: true },
  { x: -4.25, z: -7.48, floor: 3, yaw: 0 },
  { x: 13.83, z: 13.90, floor: 3, yaw: -2.37, desk: true },
  { x: 4.25, z: -7.48, floor: 4, yaw: 0 },
  { x: 0, z: 4.10, floor: 4, yaw: Math.PI, desk: true, paper: true },
  { x: -4.25, z: 7.48, floor: 5, yaw: Math.PI },
  { x: 0, z: -4.26, floor: 6, yaw: 0, desk: true },
];
const colors = ['#f2d77e','#eec388','#9dd2bb','#edb9a4','#c4c8a4','#e4c8aa'];
const frame = new THREE.MeshStandardMaterial({ color: 0x583b2c, roughness: .9 });
const wood = new THREE.MeshStandardMaterial({ color: 0x796148, roughness: .9 });
const bronze = new THREE.MeshStandardMaterial({ color: 0xb6925a, metalness: .42, roughness: .46 });
const linen = new THREE.MeshStandardMaterial({ color: 0xdacb9f, roughness: .9 });
const cover = new THREE.MeshStandardMaterial({ color: 0x51736b, roughness: .86 });
const box = new THREE.BoxGeometry();
const ring = new THREE.CylinderGeometry(.5,.5,1,10);
const skin = new THREE.PlaneGeometry();

export function pickCastleNotes(pages, random = Math.random) {
  const notes = [];
  for (const page of pages) {
    const excerpts = [page.meta, page.date, page.body, ...(page.points ?? []), page.tags?.join(' · ')].filter(Boolean);
    const unique = [...new Set(excerpts)];
    if (unique.length) notes.push({ title:page.title, chapter:page.chapterTitle, excerpts:unique });
  }
  for (let i = notes.length - 1; i > 0; i--) {
    const swap = Math.floor(random() * (i + 1));
    [notes[i],notes[swap]] = [notes[swap],notes[i]];
  }
  return notes.map(({ title, chapter, excerpts }) => {
    const text = excerpts[Math.floor(random() * excerpts.length)];
    return { title, chapter, text, more: excerpts.filter(entry => entry !== text) };
  });
}

function wrapped(context, text, width, limit) {
  const lines = [];
  for (const word of text.trim().split(/\s+/)) {
    const last = lines.at(-1);
    if (last !== undefined && context.measureText(last + ' ' + word).width < width) {
      lines[lines.length - 1] += ' ' + word;
    } else lines.push(word);
  }
  if (lines.length > limit) lines[limit - 1] += '…';
  return lines.slice(0, limit);
}

const printWidth = 960;
const printScale = .8;
const stickyLeft = 56, stickyPitch = 279, stickyWidth = 259;

function texture(notes, tabletop, index, paper) {
  const canvas = document.createElement('canvas');
  const printHeight = tabletop ? 420 : 488;
  canvas.width = printWidth * printScale;
  canvas.height = Math.ceil(printHeight * printScale);
  const ctx = canvas.getContext('2d');
  ctx.scale(printScale, printScale);
  ctx.fillStyle = tabletop ? '#766247' : '#403f34';
  ctx.fillRect(0,0,printWidth,printHeight);
  for (let i=0;i<43;i++) {
    ctx.fillStyle = i%4 ? '#d9b8790b' : '#261c123d';
    ctx.fillRect(0,i*12.1,960,2+(i%3));
  }
  const w = paper ? 750 : stickyWidth, h = paper ? 324 : tabletop ? 286 : 326;
  notes.forEach((note,i) => {
    const x = paper ? 105 : stickyLeft + i * stickyPitch;
    const y = paper ? 48 : 76 + (i % 2) * 24;
    ctx.save();
    ctx.translate(x + w/2,y+h/2);
    ctx.rotate((i%2 ? 1 : -1)*(.034 + i*.022));
    ctx.fillStyle = '#241b15a0';
    ctx.fillRect(-w/2 + 9,-h/2+11,w,h);
    ctx.fillStyle = paper ? '#f4e5bf' : colors[(index+i*2)%colors.length];
    ctx.fillRect(-w/2,-h/2,w,h);
    ctx.fillStyle = '#f3e7bf';
    ctx.fillRect(-36,-h/2-11,72,22);
    if (!tabletop) {
      ctx.fillStyle = '#923f37'; ctx.beginPath(); ctx.arc(3,-h/2+3,9,0,Math.PI*2); ctx.fill();
    }
    if (paper) {
      ctx.fillStyle = '#8d463a'; ctx.beginPath(); ctx.arc(w / 2 - 61,h / 2 - 54,19,0,Math.PI*2); ctx.fill();
    }
    ctx.fillStyle = '#253a30';
    const margin = paper ? 42 : 22, measure = w - 2 * margin;
    ctx.font = paper ? '800 40px Georgia' : '800 25px system-ui';
    const headline = wrapped(ctx,note.title,measure,2);
    headline.forEach((line,num)=>ctx.fillText(line,-w/2+margin,-h/2+(paper ? 59 : 40)+num*32,measure));
    ctx.fillRect(-w/2 + margin,-h/2+(paper ? 112 : 90),measure,2);
    ctx.font = paper ? '500 29px Georgia' : '500 20px system-ui';
    wrapped(ctx,note.text,measure,paper ? 5 : tabletop ? 6 : 8).forEach((line,num)=>{
      ctx.fillText(line,-w/2+margin,-h/2+(paper ? 154 : 118)+num*(paper ? 33 : 23),measure);
    });
    ctx.restore();
  });
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshBasicMaterial({ map, toneMapped:false });
}

function piece(group, material, x,y,z,w,h,d, geometry=box) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x,y,z);
  mesh.scale.set(w,h,d);
  group.add(mesh);
  return mesh;
}

export function buildCastleNotes(parent, world, pages, random = Math.random) {
  const notes = pickCastleNotes(pages,random);
  const stations = [];
  const picker = new THREE.Raycaster();
  const rayStart = new Vec3(), rayEnd = new Vec3();
  const obstruction = new RaycastResult();
  let offset = 0;
  for (const [index,station] of desks.entries()) {
    if (!notes.length) break;
    const { x,z,floor,yaw,desk,paper } = station;
    const y = floor * keepLevel;
    const group = new THREE.Group();
    group.position.set(x,y,z);
    group.rotation.y = yaw;
    parent.add(group);
    const count = paper ? 1 : 3;
    const excerpts = Array.from({ length: count }, (_, i) => notes[(offset + i) % notes.length]);
    offset += count;
    const art = texture(excerpts,desk,index,paper);
    let target;
    if (desk) {
      piece(group,wood,0,.88,0,2.54,.15,1.14);
      piece(group,frame,0,.759,0,2.33,.14,1.06);
      for (const a of [-1,1]) for (const b of [-1,1]) piece(group,frame,a*1.04,.409,b*.425,.15,.82,.15);
      target = piece(group,art,0,.97,.035,2.27,.97,1,skin);
      target.rotation.x = -Math.PI/2;
      const bound = piece(group,cover, -.84,1.022,-.426,.37,.078,.27);
      bound.rotation.y = .21;
      piece(group,linen,-.85,1.03,-.424,.337,.055,.264).rotation.y = .21;
      piece(group,bronze,1.00,1.01,-.393,.14,.12,.14,ring);
      keepCollision(world,x,y+.49,z,2.51,.96,1.13,yaw);
    } else {
      piece(group,frame,0,1.53,.039,3.50,1.72,.14);
      target = piece(group,art,0,1.53,.121,3.29,1.54,1,skin);
      for (const sign of [-1,1]) {
        piece(group,bronze,sign*1.68,1.53,.134,.061,1.67,.055);
        piece(group,bronze,0,1.53+sign*.819,.136,3.44,.055,.053);
      }
    }
    const approach = desk ? .84 : 1.05;
    const frontX = Math.sin(yaw), frontZ = Math.cos(yaw);
    stations.push({ x: x + frontX * approach, y, z: z + frontZ * approach, desk, paper, frontX, frontZ, excerpts, target });
  }

  function withinReach(position, station) {
    if (Math.abs(position.y - station.y - .84) > 1.32) return false;
    const dx = position.x - station.x, dz = position.z - station.z;
    return (station.desk || dx * station.frontX + dz * station.frontZ >= -.90) && Math.hypot(dx, dz) < 2.08;
  }
  function blocked(from, to, tolerance) {
    rayStart.set(from.x, from.y, from.z);
    rayEnd.set(to.x, to.y, to.z);
    return world.raycastClosest(rayStart, rayEnd, { collisionFilterMask: 1, skipBackfaces: true }, obstruction) &&
      obstruction.distance < rayStart.distanceTo(rayEnd) - tolerance;
  }
  return {
    nearby(position) {
      let nearest = null, best = 2.02;
      for (const station of stations) {
        if (!withinReach(position, station)) continue;
        const dx = position.x - station.x, dz = position.z - station.z;
        const distance = Math.hypot(dx, dz);
        if (distance < best && !blocked({ ...position, y: position.y + .47 }, { ...station, y: station.y + 1.37 }, .09)) {
          best = distance;
          nearest = station;
        }
      }
      return nearest;
    },
    at(camera, point, position) {
      picker.setFromCamera(point, camera);
      let closest = Infinity, result = null;
      for (const station of stations) {
        if (!withinReach(position, station)) continue;
        const hit = picker.intersectObject(station.target, false)[0];
        if (!hit || hit.distance >= closest || blocked(picker.ray.origin, hit.point, .13)) continue;
        const x = hit.uv.x * printWidth - stickyLeft + 10;
        const note = Math.floor(x / stickyPitch);
        const onSticky = note >= 0 && note < station.excerpts.length && x % stickyPitch < stickyWidth + 16;
        closest = hit.distance;
        result = { station, selected: station.paper ? 0 : onSticky ? note : -1 };
      }
      return result;
    },
  };
}
