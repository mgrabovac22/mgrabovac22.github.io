import * as THREE from 'three';
import { keepCollision, keepLevel } from './drive-castle-keep.js';

const desks = [
  { x: -3.25, z: -7.70, floor: 0, yaw: 0, desk: true },
  { x: 4.46, z: 10.54, floor: 0, yaw: Math.PI },
  { x: -10.52, z: -4.65, floor: 0, yaw: Math.PI / 2 },
  { x: 2.90, z: 5.87, floor: 1, yaw: Math.PI, desk: true },
  { x: 4.48, z: -10.52, floor: 1, yaw: 0 },
  { x: 10.52, z: -4.67, floor: 1, yaw: -Math.PI / 2 },
  { x: -13.64, z: 12.81, floor: 1, yaw: Math.PI / 2, desk: true },
  { x: -3.29, z: 5.98, floor: 2, yaw: Math.PI, desk: true },
  { x: -10.52, z: 3.76, floor: 2, yaw: Math.PI / 2 },
  { x: 4.39, z: -10.52, floor: 2, yaw: 0 },
  { x: 13.88, z: -13.88, floor: 2, yaw: -.75, desk: true },
  { x: -3.60, z: -5.78, floor: 3, yaw: 0, desk: true },
  { x: 13.83, z: 13.90, floor: 3, yaw: -2.37, desk: true },
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
  return notes.map(({ title, chapter, excerpts }) => ({ title, chapter, text: excerpts[Math.floor(random() * excerpts.length)] }));
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

function texture(notes, tabletop, index) {
  const canvas = document.createElement('canvas');
  canvas.width = 960;
  canvas.height = tabletop ? 420 : 488;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = tabletop ? '#766247' : '#403f34';
  ctx.fillRect(0,0,canvas.width,canvas.height);
  for (let i=0;i<43;i++) {
    ctx.fillStyle = i%4 ? '#d9b8790b' : '#261c123d';
    ctx.fillRect(0,i*12.1,960,2+(i%3));
  }
  const w = 259, h = tabletop ? 286 : 326;
  notes.forEach((note,i) => {
    const x = 56 + i*279, y = 76 + (i % 2)*24;
    ctx.save();
    ctx.translate(x + w/2,y+h/2);
    ctx.rotate((i%2 ? 1 : -1)*(.034 + i*.022));
    ctx.fillStyle = '#241b15a0';
    ctx.fillRect(-w/2 + 9,-h/2+11,w,h);
    ctx.fillStyle = colors[(index+i*2)%colors.length];
    ctx.fillRect(-w/2,-h/2,w,h);
    ctx.fillStyle = '#f3e7bf';
    ctx.fillRect(-36,-h/2-11,72,22);
    if (!tabletop) {
      ctx.fillStyle = '#923f37'; ctx.beginPath(); ctx.arc(3,-h/2+3,9,0,Math.PI*2); ctx.fill();
    }
    ctx.fillStyle = '#253a30';
    ctx.font = '800 25px system-ui';
    const headline = wrapped(ctx,note.title,215,2);
    headline.forEach((line,num)=>ctx.fillText(line,-w/2+22,-h/2+40+num*28,215));
    ctx.fillRect(-w/2 + 22,-h/2+85,215,2);
    ctx.font = '500 20px system-ui';
    wrapped(ctx,note.text,215,tabletop ? 6 : 8).forEach((line,num)=>{
      ctx.fillText(line,-w/2+22,-h/2+114+num*23,215);
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
  if (!notes.length) return { nearby: () => null };
  for (const [index,station] of desks.entries()) {
    const { x,z,floor,yaw,desk } = station;
    const y = floor * keepLevel;
    const group = new THREE.Group();
    group.position.set(x,y,z);
    group.rotation.y = yaw;
    parent.add(group);
    const offset = index * 3;
    const excerpts = [0,1,2].map(i => notes[(offset+i)%notes.length]);
    const art = texture(excerpts,desk,index);
    if (desk) {
      piece(group,wood,0,.88,0,2.54,.15,1.14);
      piece(group,frame,0,.759,0,2.33,.14,1.06);
      for (const a of [-1,1]) for (const b of [-1,1]) piece(group,frame,a*1.04,.409,b*.425,.15,.82,.15);
      piece(group,art,0,.959,.035,2.27,.97,1,skin).rotation.x = -Math.PI/2;
      const bound = piece(group,cover, -.84,1.022,-.426,.37,.078,.27);
      bound.rotation.y = .21;
      piece(group,linen,-.85,1.03,-.424,.337,.055,.264).rotation.y = .21;
      piece(group,bronze,1.00,1.01,-.393,.14,.12,.14,ring);
      keepCollision(world,x,y+.49,z,2.51,.96,1.13,yaw);
    } else {
      piece(group,frame,0,1.53,.039,3.50,1.72,.14);
      piece(group,art,0,1.53,.121,3.29,1.54,1,skin);
      for (const sign of [-1,1]) {
        piece(group,bronze,sign*1.68,1.53,.134,.061,1.67,.055);
        piece(group,bronze,0,1.53+sign*.819,.136,3.44,.055,.053);
      }
    }
    const approach = desk ? .84 : 1.05;
    const frontX = Math.sin(yaw), frontZ = Math.cos(yaw);
    stations.push({ x: x + frontX * approach, y, z: z + frontZ * approach, desk, frontX, frontZ, excerpts });
  }
  return {
    nearby(position) {
      let nearest = null, best = 2.02;
      for (const station of stations) {
        if (Math.abs(position.y - station.y - .84) > 1.32) continue;
        const dx = position.x - station.x, dz = position.z - station.z;
        if (!station.desk && dx * station.frontX + dz * station.frontZ < -.90) continue;
        const distance = Math.hypot(dx, dz);
        if (distance < best) {
          best = distance;
          nearest = station;
        }
      }
      return nearest;
    },
  };
}
