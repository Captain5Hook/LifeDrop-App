import type { UserProfileData } from '../services/profileService';

export function downloadDonorCertificate(profile: UserProfileData): void {
  const width = 1200;
  const height = 840;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Night-sky purple gradient backdrop matching LifeDrop identity
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#1B1740');
  bgGrad.addColorStop(0.55, '#2E2569');
  bgGrad.addColorStop(1, '#5B3FE0');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Subtle decorative star dots
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  const starPositions = [
    [110, 95],
    [240, 140],
    [980, 110],
    [1080, 190],
    [160, 710],
    [1040, 700],
    [600, 88],
    [820, 745],
  ];
  for (const [sx, sy] of starPositions) {
    ctx.beginPath();
    ctx.arc(sx, sy, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Outer gold-lavender border frame
  ctx.strokeStyle = 'rgba(255,255,255,0.32)';
  ctx.lineWidth = 3;
  ctx.strokeRect(36, 36, width - 72, height - 72);

  ctx.strokeStyle = '#34D399';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(52, 52, width - 104, height - 104);

  // Header brand pill
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.beginPath();
  ctx.roundRect(width / 2 - 140, 92, 280, 44, 22);
  ctx.fill();

  ctx.fillStyle = '#34D399';
  ctx.font = 'bold 18px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('LIFEDROP INDIA', width / 2, 120);

  // Main certificate heading
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '300 48px Inter, system-ui, sans-serif';
  ctx.fillText('Certificate of Voluntary Appreciation', width / 2, 205);

  ctx.fillStyle = 'rgba(255,255,255,0.72)';
  ctx.font = '20px Inter, system-ui, sans-serif';
  ctx.fillText('PROUDLY PRESENTED TO', width / 2, 265);

  // Donor Name
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '600 54px Inter, system-ui, sans-serif';
  ctx.fillText(profile.displayName, width / 2, 338);

  // Underline
  ctx.strokeStyle = 'rgba(255,255,255,0.28)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(width / 2 - 260, 362);
  ctx.lineTo(width / 2 + 260, 362);
  ctx.stroke();

  // Body description
  ctx.fillStyle = 'rgba(255,255,255,0.88)';
  ctx.font = '24px Inter, system-ui, sans-serif';
  ctx.fillText(
    'In recognition of selfless commitment to voluntary blood donation',
    width / 2,
    420,
  );
  ctx.fillText(
    `supporting emergency patients across ${profile.city}, ${profile.stateName}.`,
    width / 2,
    458,
  );

  // Stats boxes row
  const boxes = [
    {
      label: 'BLOOD GROUP',
      value: `${profile.bloodGroup} (${profile.bloodGroupStatus === 'lab-confirmed' ? 'Confirmed' : 'Self-reported'})`,
    },
    {
      label: 'DONATIONS LOGGED',
      value: `${profile.donationsCount}`,
    },
    {
      label: 'BADGE LEVEL',
      value:
        profile.donationsCount >= 5
          ? '5x Hero'
          : profile.donationsCount >= 3
            ? 'Life Saver'
            : profile.donationsCount >= 1
              ? 'First Drop'
              : 'Registered Donor',
    },
  ];

  const cardWidth = 310;
  const gap = 36;
  const startX = (width - (cardWidth * 3 + gap * 2)) / 2;

  boxes.forEach((box, idx) => {
    const x = startX + idx * (cardWidth + gap);
    const y = 515;
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x, y, cardWidth, 128, 22);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#C4B5FD';
    ctx.font = 'bold 14px Inter, system-ui, sans-serif';
    ctx.fillText(box.label, x + cardWidth / 2, y + 42);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '600 24px Inter, system-ui, sans-serif';
    ctx.fillText(box.value, x + cardWidth / 2, y + 88);
  });

  // Footer
  const issuedDate = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  ctx.fillStyle = 'rgba(255,255,255,0.68)';
  ctx.font = '18px Inter, system-ui, sans-serif';
  ctx.fillText(
    `Issued on ${issuedDate} · Generated locally with zero cloud storage cost`,
    width / 2,
    732,
  );
  ctx.font = '15px Inter, system-ui, sans-serif';
  ctx.fillText(
    'Note: Voluntary non-remunerated blood donation · 108 / 112 Emergency India',
    width / 2,
    766,
  );

  // Trigger PNG download
  const dataUrl = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  const safeName = profile.displayName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  link.download = `lifedrop-certificate-${safeName || 'donor'}.png`;
  link.href = dataUrl;
  link.click();
}
