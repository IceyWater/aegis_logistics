"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Route = { from: string; to: string; late: boolean };
type Hub = { name: string; x: number; y: number };
type NetworkData = { hubs: Hub[]; routes: Route[]; shipments: { shipment_id: string; late: boolean; probability: number; weather: string; hub_load_pct: number }[]; note: string };

const positions: Record<string, [number, number]> = {
  "North Hub": [105, 88],
  "South Hub": [290, 255],
  "East Hub": [493, 75],
  "West Hub": [134, 218],
};

function routePath(route: Route, index: number) {
  const [x1, y1] = positions[route.from] ?? [0, 0];
  const [x2, y2] = positions[route.to] ?? [0, 0];
  const bend = index % 2 === 0 ? -32 : 34;
  return `M ${x1} ${y1} Q ${(x1 + x2) / 2} ${(y1 + y2) / 2 + bend} ${x2} ${y2}`;
}

export function NetworkMap() {
  const [network, setNetwork] = useState<NetworkData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<NetworkData>("/api/network")
      .then(setNetwork)
      .catch((reason: Error) => setError(reason.message));
  }, []);

  return (
    <section className="network-panel" aria-label="Live parcel route network">
      <div className="network-head">
        <div>
          <span className="panel-label">REGIONAL NETWORK / LIVE FEED</span>
          <strong>Route intelligence</strong>
        </div>
        <span className="live-tag"><i /> MODEL CONNECTED</span>
      </div>
      <svg className="network-map" viewBox="0 0 600 330" role="img" aria-label="Live routes between four parcel hubs">
        <defs>
          <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M32 0H0V32" fill="none" stroke="#DFE4EA" strokeWidth=".7" />
          </pattern>
        </defs>
        <rect width="600" height="330" fill="url(#grid)" />
        <g fill="none" stroke="#DFE4EA" strokeWidth="1">
          <path d="M10 145c80-45 95-5 158-42s78-51 131-22 82 35 128 9 102-49 163-11" />
          <path d="M8 177c73-20 99 19 161-13s73-52 129-27 90 43 139 16 103-45 154-18" />
          <path d="M26 112c54 22 85 12 118-10s69-32 119-8 79 56 136 42 100-53 164-37" />
          <path d="M39 219c80-34 96-5 155-22s105-41 153-9 90 41 142 6 76-35 111-21" />
        </g>
        {network?.routes.map((route, index) => {
          const path = routePath(route, index);
          return (
            <g key={`${route.from}-${route.to}-${index}`}>
              <path d={path} className={`route-path${route.late ? " route-late" : ""}`} />
              <circle r={route.late ? 4 : 3} className={`route-parcel${route.late ? " parcel-late" : ""}`}>
                <animateMotion
                  dur={`${8 + index * 1.5}s`}
                  begin={`${-index * 1.2}s`}
                  repeatCount="indefinite"
                  path={path}
                />
              </circle>
            </g>
          );
        })}
        {(network?.hubs ?? Object.keys(positions).map((name) => ({ name } as Hub))).map((hub) => {
          const [x, y] = positions[hub.name] ?? [hub.x * 6, hub.y * 3.3];
          return (
            <g key={hub.name}>
              <circle cx={x} cy={y} r="12" className="hub-ring" />
              <circle cx={x} cy={y} r="4" className="hub-core" />
              <text x={x + 15} y={y + 3} className="hub-label">{hub.name.toUpperCase()}</text>
            </g>
          );
        })}
      </svg>
      <div className="network-legend">
        <span><i className="legend-dot navy-dot" />ACTIVE SHIPMENT</span>
        <span><i className="legend-dot amber-dot" />LATE CLASSIFICATION</span>
        <span className="live-count">{network ? `${network.shipments.length} REAL SVC SCORES · ILLUSTRATIVE LINKS` : error || "CONNECTING TO MODEL API"}</span>
      </div>
      <div className="network-ticker" aria-live="polite">
        <span className="ticker-title">LATEST RECORDS</span>
        <div className="ticker-content">
          {(network?.shipments ?? []).slice(0, 4).map((shipment) => (
            <span className="ticker-item" key={shipment.shipment_id}>
              <b>{shipment.shipment_id}</b>
              <span className={shipment.late ? "late-text" : ""}>{shipment.late ? `LATE RISK · ${shipment.probability}%` : `ON-TIME · ${shipment.probability}%`}</span>
              <span>{shipment.weather.replaceAll("_", " ")} · hub {shipment.hub_load_pct}%</span>
            </span>
          ))}
          {!network && !error && <span>Loading shipment records…</span>}
        </div>
      </div>
    </section>
  );
}
