/**
 * TradingView — thin route adapter for `/game/vendor/:npcId`.
 *
 * The vendor experience now lives in <VendorPanel/>, a prop-driven in-world
 * overlay rendered directly by the 3D host pages (PlanetSurface3D / SubMapView3D).
 * This route is kept as a full-page wrapper for the legacy 2D pages
 * (PlanetSurface.jsx / SubMapView.jsx) and any deep-link, and it preserves the
 * `/game/vendor/...` URL that TutorialOverlay still keys its vendor steps on.
 */

import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import VendorPanel from './VendorPanel';
import TutorialOverlay from '../../components/tutorial/TutorialOverlay';
import './VendorPanel.css';

export default function TradingView() {
  const { npcId } = useParams();
  const navigate = useNavigate();
  return (
    <div className="trading-view-route">
      <VendorPanel npcId={npcId} onClose={() => navigate(-1)} />
      <TutorialOverlay />
    </div>
  );
}
