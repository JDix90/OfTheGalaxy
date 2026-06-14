/**
 * PostFX — the post-processing chain (Phase 2): the "secret sauce" the brief flags.
 *
 * RenderPass → N8AO (high-quality contact AO) → Bloom (emissive structures + sun/moon
 * glow) → ToneMapping (ACES) → SMAA. The host Canvas must be `flat` (renderer tone
 * mapping off) so tone mapping happens once, here, after bloom.
 *
 * `quality` scales cost: 'low' drops AO; 'high' uses half-res AO + mipmap bloom.
 */

import React from 'react';
import { EffectComposer, Bloom, N8AO, ToneMapping, SMAA } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';

export default function PostFX({ quality = 'high' }) {
  if (quality === 'off') return null;
  const ao = quality !== 'low';

  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      {ao && (
        <N8AO
          aoRadius={3.2}
          distanceFalloff={1.0}
          intensity={2.6}
          quality={quality === 'high' ? 'medium' : 'low'}
          halfRes={quality !== 'ultra'}
          color="black"
          screenSpaceRadius={false}
        />
      )}
      <Bloom
        mipmapBlur
        intensity={0.9}
        luminanceThreshold={0.6}
        luminanceSmoothing={0.25}
        radius={0.7}
      />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <SMAA />
    </EffectComposer>
  );
}
