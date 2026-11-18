import * as THREE from 'three';
import { waterline } from './drive-rally-terrain.js';

const material = color => new THREE.MeshStandardMaterial({ color, roughness: .84 });
const bark = material(0x79543a);
const linen = material(0xf0d3a0);
const red = material(0xb34a36);
const yellow = material(0xe5a449);
const teal = material(0x3c9a8c);
const reef = material(0x788c73);
const charcoal = material(0x444e45);
const basalt = material(0x526351);
const glow = new THREE.MeshBasicMaterial({ color: 0xffb853 });
const cream = new THREE.MeshBasicMaterial({ color: 0xd6f3db });
const sphere = new THREE.IcosahedronGeometry(.5, 1);
const box = new THREE.BoxGeometry();
const pole = new THREE.CylinderGeometry(.5, .59, 1, 9);
const ring = new THREE.RingGeometry(.83, 1, 34).rotateX(-Math.PI / 2);

function at(point, side, along = 0) {
  return { x: point.x + point.nx * side + point.tx * along, z: point.z + point.nz * side + point.tz * along };
}

function part(parent, geo, surface, x, y, z, width, height, depth) {
  const mesh = new THREE.Mesh(geo, surface);
  mesh.position.set(x, y, z);
  mesh.scale.set(width, height, depth);
  parent.add(mesh);
  return mesh;
}

export function buildBeachDetails(parent, props, route, terrain, keepClear) {
  const fires = [];
  for (const [station, side] of [[11,-11.2], [85,-13.6], [232,-12.6], [432,18.5], [552,-34], [685,17.8], [785,-13.6]]) {
    const p = route.sample(station);
    const { x, z } = at(p, side);
    const y = terrain.height(x, z);
    if (y < -.20 || keepClear(x, z)) continue;
    const fire = part(parent, sphere, glow, x, y + .35, z, .36,.53,.38);
    fires.push({ fire, y, offset: station });
    props.place({ x, y: y + .27, z, yaw: p.yaw, bounds: [.69,.19,.61], mass: 19, effect: 'dust',
      onKnock: () => { fire.visible = false; }, onReset: () => { fire.visible = true; } }, draw => {
      for (let i = 0; i < 10; i++) {
        const direction = i * Math.PI / 5;
        draw(i % 3 ? charcoal : reef, x + Math.sin(direction) * .61, y + .12, z + Math.cos(direction) * .58,
          .36,.29,.34,direction,sphere);
      }
      for (const angle of [.3, 1.36, 2.46]) draw(bark,x,y+.18,z,.13,.13,.99,angle);
    });
    for (const [index, offset] of [-2.35, 2.27].entries()) {
      const seat = at(p, side + offset, 1.45);
      const dry = terrain.height(seat.x, seat.z);
      if (dry < -.18 || keepClear(seat.x, seat.z)) continue;
      props.place({ ...seat, y: dry + .29, yaw: p.yaw, bounds: [.75,.28,.37], mass: 10, effect: 'timber' }, draw => {
        for (const foot of [-.51,.51]) {
          const q = at({ ...p, ...seat }, foot);
          draw(bark,q.x,dry+.19,q.z,.12,.38,.55,p.yaw);
        }
        draw(index ? linen : teal, seat.x,dry+.40,seat.z,1.52,.089,.61,p.yaw);
        draw(yellow,seat.x,dry+.46,seat.z,.55,.073,.51,p.yaw);
      });
    }
    const q = at(p, side - 1.7, -2.3);
    const dry = terrain.height(q.x, q.z);
    if (dry < -.19 || keepClear(q.x, q.z)) continue;
    props.place({ ...q, y: dry + .77, yaw: p.yaw, bounds: [.21,.79,.19], mass: 8, effect: 'timber' }, draw => {
      draw(bark,q.x,dry+.77,q.z,.14,1.54,.14,p.yaw,pole);
      draw(linen,q.x,dry+1.45,q.z,.34,.38,.34,p.yaw,pole);
      draw(red,q.x,dry+1.66,q.z,.38,.08,.38,p.yaw,pole);
      draw(glow,q.x,dry+1.46,q.z,.17,.28,.18,p.yaw,sphere);
    });
  }

  const crabs = [];
  for (const station of [24, 58, 135, 222, 326, 420, 563, 660, 794, 835]) {
    const p = route.sample(station);
    for (let side = 17.0; side < 34.0; side += 1.3) {
      const q = at(p, side);
      const y = terrain.height(q.x, q.z);
      if (y < -.28 || y > -.12 || keepClear(q.x, q.z)) continue;
      for (let index = 0; index < 2; index++) {
        const view = new THREE.Group();
        parent.add(view);
        part(view, sphere, red, 0,.14,0,.39,.185,.27);
        for (const claw of [-1, 1]) {
          part(view, sphere, yellow, claw*.23,.19,-.11,.18,.129,.15);
          part(view, sphere, charcoal, claw*.087,.235,-.054,.048,.056,.046);
        }
        crabs.push({ view, p, side, offset: station * .134 + index * 2.48 });
      }
      break;
    }
  }

  const p = route.sample(557);
  const cliff = at(p, -43.3);
  const wash = new THREE.Group();
  wash.position.set(cliff.x, .16, cliff.z);
  wash.rotation.y = p.yaw + Math.PI / 2;
  parent.add(wash);
  for (let i = 0; i < 12; i++) {
    const side = (i % 5 - 2) * .89;
    part(wash, sphere, i % 3 ? basalt : reef, side, .78 + (i % 3) * 1.16, -1.12 - (i % 3) * .39,
      2.15, 2.1 + (i % 4) * .30, 2.53).rotation.y = i * .91;
  }
  const curtain = new THREE.ShaderMaterial({
    side: THREE.DoubleSide, transparent: true, depthWrite: false, uniforms: { time: { value: 0 } },
    vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `varying vec2 vUv; uniform float time;
      void main() {
        vec2 p = vUv;
        float streak = .5 + .5 * sin(p.x * 64. + p.y * 11. + time * 3.);
        float foam = .52 + .48 * sin(p.x * 20. - p.y * 38. + time * 8.);
        float edge = smoothstep(0., .2, p.x) * (1. - smoothstep(.81, 1., p.x));
        gl_FragColor = vec4(.40 + streak * .28, .76 + foam * .19, .82 + foam * .16, edge * (.38 + streak * .39));
        #include <colorspace_fragment>
      }`,
  });
  part(wash,new THREE.PlaneGeometry(),curtain,0,1.75,.31,2.31,3.21,1).rotation.x = -.09;
  part(wash, sphere, teal, 0, -.06, 1.09, 3.53, .19, 2.48);
  const foam = part(wash, ring, cream, 0, .057, 1.05, 1.53,1,1.00);
  return {
    update(time, position) {
      curtain.uniforms.time.value = time;
      foam.scale.set(1.36 + Math.sin(time * 2.2) * .12, 1, .85 + Math.sin(time * 2.2) * .07);
      for (const { fire, y, offset } of fires) {
        const flicker = Math.sin(time * 8 + offset);
        fire.position.y = y + .37 + flicker * .05;
        fire.scale.set(.34 + flicker * .04, .54 - flicker * .12, .35 + flicker * .04);
      }
      for (const { view, p, side, offset } of crabs) {
        const near = Math.hypot(p.x + p.nx * side - position.x, p.z + p.nz * side - position.z) < 5;
        const phase = time * (near ? 2.4 : .75) + offset;
        const q = at(p, side - .49 + Math.sin(phase * .8) * .57, Math.cos(phase) * 1.62);
        view.position.set(q.x, terrain.height(q.x, q.z), q.z);
        view.rotation.y = p.yaw + Math.sin(phase * 1.7) * .13;
      }
    },
  };
}
