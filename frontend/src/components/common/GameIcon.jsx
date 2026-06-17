/**
 * GameIcon — one place to map semantic game concepts to vector icons, so the UI
 * uses crisp, theme-tintable SVGs instead of OS-dependent emoji. Add a concept
 * here once and reference it by name everywhere: <GameIcon name="attack" />.
 *
 * Icons inherit `color` (currentColor) and size from props, so they recolor with
 * their surrounding text and stay sharp at any scale.
 */

import React from 'react';
import {
  Sword, Shield, Target, Wind, FlaskConical, Sparkles, Star, GraduationCap,
  Dumbbell, Heart, Rocket, Check, TriangleAlert, Info, Handshake, PartyPopper,
  Skull, Coins, Hammer, Backpack, Crosshair, Zap, ShoppingCart, History
} from 'lucide-react';

const ICONS = {
  // Combat actions
  attack: Sword,
  defend: Shield,
  accuracy: Crosshair,
  ability: Sparkles,
  flee: Wind,
  item: FlaskConical,
  // Progression / rewards
  levelup: Star,
  skill: GraduationCap,
  attribute: Dumbbell,
  health: Heart,
  power: Zap,
  // Navigation / standing
  course: Rocket,
  credits: Coins,
  shop: ShoppingCart,
  history: History,
  rep: Handshake,
  crafting: Hammer,
  inventory: Backpack,
  target: Target,
  // Toast / outcome
  success: Check,
  warning: TriangleAlert,
  info: Info,
  victory: PartyPopper,
  defeat: Skull
};

export default function GameIcon({ name, size = 18, strokeWidth = 2, className = '', ...rest }) {
  const Cmp = ICONS[name];
  if (!Cmp) return null;
  return (
    <Cmp
      size={size}
      strokeWidth={strokeWidth}
      className={`game-icon${className ? ` ${className}` : ''}`}
      aria-hidden="true"
      {...rest}
    />
  );
}

export const GAME_ICON_NAMES = Object.keys(ICONS);
