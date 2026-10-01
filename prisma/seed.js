import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database for AtlasEcho with 4 users, Cape Town echoes, and global echoes...');

  // Clean existing data
  await prisma.notification.deleteMany();
  await prisma.like.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.echo.deleteMany();
  await prisma.follow.deleteMany();
  await prisma.user.deleteMany();

  const hashedPassword = await bcrypt.hash('password123', 10);

  // 1. Create Default User (Julian)
  const julian = await prisma.user.create({
    data: {
      username: 'julian_thorne',
      email: 'julian@atlas.com',
      password: hashedPassword,
      fullName: 'Julian Thorne',
      displayName: 'Julian Echo',
      bio: 'Mapping the world one vintage bookstore and hidden coastal trail at a time. Currently chasing memory traces across South Africa and Europe.',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
      bannerUrl: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1200&q=80',
      badges: '#GlobalExplorer #MemoryKeeper #Top5%Explorer',
      totalMiles: 12480,
      countriesCount: 14,
      publicVisibility: true,
      distanceUnits: 'Miles',
      mapStyle: 'Nostalgic Ink'
    }
  });

  // 2. Create the 4 Requested Other Users
  const amara = await prisma.user.create({
    data: {
      username: 'amara_explorer',
      email: 'amara@atlas.com',
      password: hashedPassword,
      fullName: 'Amara Diallo',
      displayName: 'Amara Diallo',
      bio: 'Coastal photographer & sunset hunter. Documenting Cape Town secrets, hidden tidal pools, and ocean sunset trails.',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
      bannerUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
      badges: '#CapeTownLocal #SunsetHunter #TidalPools',
      totalMiles: 9420,
      countriesCount: 8
    }
  });

  const liam = await prisma.user.create({
    data: {
      username: 'liam_cape',
      email: 'liam@atlas.com',
      password: hashedPassword,
      fullName: 'Liam Botha',
      displayName: 'Liam Botha',
      bio: 'Mountaineer and trailrunner based in Cape Town. Always chasing summits from Lion\'s Head to the Drakensberg.',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
      bannerUrl: 'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?auto=format&fit=crop&w=1200&q=80',
      badges: '#MountainRunner #SummitSeeker #CapeTownHiker',
      totalMiles: 14200,
      countriesCount: 12
    }
  });

  const maya = await prisma.user.create({
    data: {
      username: 'maya_wanderlust',
      email: 'maya@atlas.com',
      password: hashedPassword,
      fullName: 'Maya Lin',
      displayName: 'Maya Lin',
      bio: 'Culture seeker and food enthusiast. Exploring artisanal markets, art districts, and surf breaks around the world.',
      avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
      bannerUrl: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1200&q=80',
      badges: '#CultureSeeker #FoodieTravels #SurfLife',
      totalMiles: 18500,
      countriesCount: 19
    }
  });

  const mateo = await prisma.user.create({
    data: {
      username: 'mateo_voyages',
      email: 'mateo@atlas.com',
      password: hashedPassword,
      fullName: 'Mateo Silva',
      displayName: 'Mateo Silva',
      bio: 'Architect and urban sketcher. Mapping harbor towns, botanical gardens, and historic stone facades across continents.',
      avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80',
      bannerUrl: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1200&q=80',
      badges: '#UrbanSketcher #Architecture #Botanical',
      totalMiles: 11300,
      countriesCount: 11
    }
  });

  // Follow relationships
  await prisma.follow.create({ data: { followerId: amara.id, followingId: julian.id } });
  await prisma.follow.create({ data: { followerId: liam.id, followingId: julian.id } });
  await prisma.follow.create({ data: { followerId: maya.id, followingId: amara.id } });
  await prisma.follow.create({ data: { followerId: mateo.id, followingId: liam.id } });

  // 3. Create 7 Echoes CLOSE TO CAPE TOWN
  const echo1 = await prisma.echo.create({
    data: {
      title: 'Above Table Mountain Clouds',
      content: 'Stood at the summit plateau watching the fog cascade over the Twelve Apostles peaks like a white waterfall. Crisp mountain air and 360-degree views across Table Bay.',
      locationName: 'Table Mountain, Cape Town',
      latitude: -33.9628,
      longitude: 18.4098,
      imageUrl: 'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?auto=format&fit=crop&w=1000&q=80',
      weatherTemp: '68°F',
      weatherCondition: 'Sunny',
      weatherIcon: 'sun',
      tags: '#CapeTown #TableMountain #Hike',
      authorId: liam.id,
      createdAt: new Date(Date.now() - 3600000 * 2) // 2 hours ago
    }
  });

  const echo2 = await prisma.echo.create({
    data: {
      title: 'Camps Bay Sunset Glow',
      content: 'Golden hour over the Atlantic Ocean with palm trees and granite boulders glowing in deep orange light. The ocean spray was refreshing after an afternoon coastal walk.',
      locationName: 'Camps Bay Beach, Cape Town',
      latitude: -33.9507,
      longitude: 18.3774,
      imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1000&q=80',
      weatherTemp: '73°F',
      weatherCondition: 'Clear',
      weatherIcon: 'sun',
      tags: '#CampsBay #Sunset #Beach',
      authorId: amara.id,
      createdAt: new Date(Date.now() - 3600000 * 5) // 5 hours ago
    }
  });

  const echo3 = await prisma.echo.create({
    data: {
      title: 'V&A Waterfront Harbor Evening',
      content: 'Live street jazz music, smell of wood-fired seafood, and watching harbor tugboats glide past against the shadow of Table Mountain.',
      locationName: 'V&A Waterfront, Cape Town',
      latitude: -33.9056,
      longitude: 18.4211,
      imageUrl: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1000&q=80',
      weatherTemp: '66°F',
      weatherCondition: 'Pleasant',
      weatherIcon: 'sun',
      tags: '#Waterfront #Harbor #CapeTown',
      authorId: maya.id,
      createdAt: new Date(Date.now() - 3600000 * 12) // 12 hours ago
    }
  });

  const echo4 = await prisma.echo.create({
    data: {
      title: 'Kirstenbosch Tree Canopy Walk',
      content: 'Walking along the "Boomslang" timber bridge suspended above the treetops. King proteas are blooming all along the lower slopes.',
      locationName: 'Kirstenbosch Botanical Gardens, Cape Town',
      latitude: -33.9880,
      longitude: 18.4323,
      imageUrl: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1000&q=80',
      weatherTemp: '70°F',
      weatherCondition: 'Sunny',
      weatherIcon: 'sun',
      tags: '#Kirstenbosch #Protea #Botanical',
      authorId: mateo.id,
      createdAt: new Date(Date.now() - 3600000 * 24 * 1) // 1 day ago
    }
  });

  const echo5 = await prisma.echo.create({
    data: {
      title: 'Cliffs of Cape Point',
      content: 'At the dramatic southwestern edge of Africa! Sea breezes, steep ocean cliffs, and seeing where two immense currents meet.',
      locationName: 'Cape Point, Cape Peninsula',
      latitude: -34.3568,
      longitude: 18.4975,
      imageUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1000&q=80',
      weatherTemp: '62°F',
      weatherCondition: 'Windy',
      weatherIcon: 'cloud-wind',
      tags: '#CapePoint #Ocean #WildSouthAfrica',
      authorId: liam.id,
      createdAt: new Date(Date.now() - 3600000 * 24 * 2) // 2 days ago
    }
  });

  const echo6 = await prisma.echo.create({
    data: {
      title: 'Signal Hill Paragliders',
      content: 'Watching colorful tandem paragliders float smoothly down towards Sea Point Promenade while eating sunset snacks.',
      locationName: 'Signal Hill, Cape Town',
      latitude: -33.9175,
      longitude: 18.4028,
      imageUrl: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1000&q=80',
      weatherTemp: '69°F',
      weatherCondition: 'Breezy',
      weatherIcon: 'sun',
      tags: '#SignalHill #Paragliding #CapeTown',
      authorId: amara.id,
      createdAt: new Date(Date.now() - 3600000 * 24 * 3) // 3 days ago
    }
  });

  const echo7 = await prisma.echo.create({
    data: {
      title: 'Colorful Huts of Muizenberg',
      content: 'Early morning surf session in front of the iconic bright yellow, red, and blue wooden bathhouses on False Bay shore.',
      locationName: 'Muizenberg Beach, False Bay',
      latitude: -34.1082,
      longitude: 18.4691,
      imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1000&q=80',
      weatherTemp: '71°F',
      weatherCondition: 'Clear',
      weatherIcon: 'sun',
      tags: '#Muizenberg #Surf #BeachHuts',
      authorId: maya.id,
      createdAt: new Date(Date.now() - 3600000 * 24 * 4) // 4 days ago
    }
  });

  // 4. Create 6 Echoes AROUND THE WORLD
  const echoWorld1 = await prisma.echo.create({
    data: {
      title: 'Champ de Mars Twilight',
      content: 'Golden twilight over Champ de Mars. The Eiffel Tower sparkling on the hour as night fell over the Seine.',
      locationName: 'Paris, France',
      latitude: 48.8584,
      longitude: 2.2945,
      imageUrl: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1000&q=80',
      weatherTemp: '64°F',
      weatherCondition: 'Clear',
      weatherIcon: 'sun',
      tags: '#Paris #Eiffel #France',
      authorId: mateo.id,
      createdAt: new Date(Date.now() - 3600000 * 24 * 5)
    }
  });

  const echoWorld2 = await prisma.echo.create({
    data: {
      title: 'Shibuya Neon Rain',
      content: 'Giant LED screen reflections in rain puddles. Stepped into a tiny 4-seat ramen bar tucked away in an alleyway.',
      locationName: 'Shibuya, Tokyo',
      latitude: 35.6595,
      longitude: 139.7004,
      imageUrl: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1000&q=80',
      weatherTemp: '58°F',
      weatherCondition: 'Rainy',
      weatherIcon: 'cloud-rain',
      tags: '#Tokyo #Shibuya #Japan',
      authorId: maya.id,
      createdAt: new Date(Date.now() - 3600000 * 24 * 6)
    }
  });

  const echoWorld3 = await prisma.echo.create({
    data: {
      title: 'Autumn in Central Park',
      content: 'Golden ginkgo leaves raining down along the Promenade pathway. Street violinists playing classical tunes.',
      locationName: 'Central Park, New York',
      latitude: 40.7932,
      longitude: -73.9515,
      imageUrl: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=1000&q=80',
      weatherTemp: '60°F',
      weatherCondition: 'Crisp',
      weatherIcon: 'cloud',
      tags: '#NYC #CentralPark #Autumn',
      authorId: amara.id,
      createdAt: new Date(Date.now() - 3600000 * 24 * 7)
    }
  });

  const echoWorld4 = await prisma.echo.create({
    data: {
      title: 'Sydney Opera House Harbour',
      content: 'Ferry ride from Manly to Circular Quay. Bright sunshine sparkling on the white sails of the Opera House.',
      locationName: 'Sydney Harbour, Australia',
      latitude: -33.8568,
      longitude: 151.2153,
      imageUrl: 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?auto=format&fit=crop&w=1000&q=80',
      weatherTemp: '75°F',
      weatherCondition: 'Sunny',
      weatherIcon: 'sun',
      tags: '#Sydney #OperaHouse #Australia',
      authorId: liam.id,
      createdAt: new Date(Date.now() - 3600000 * 24 * 8)
    }
  });

  const echoWorld5 = await prisma.echo.create({
    data: {
      title: 'Sugarloaf Cable Car Ascend',
      content: 'Riding the glass cable car up Sugarloaf Mountain with views over Copacabana and Corcovado in the distance.',
      locationName: 'Rio de Janeiro, Brazil',
      latitude: -22.9492,
      longitude: -43.1545,
      imageUrl: 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?auto=format&fit=crop&w=1000&q=80',
      weatherTemp: '82°F',
      weatherCondition: 'Sunny',
      weatherIcon: 'sun',
      tags: '#Rio #Sugarloaf #Brazil',
      authorId: mateo.id,
      createdAt: new Date(Date.now() - 3600000 * 24 * 9)
    }
  });

  const echoWorld6 = await prisma.echo.create({
    data: {
      title: 'Tower Bridge & South Bank Walk',
      content: 'Atmospheric evening walk along the Thames riverbank as Tower Bridge illuminated against the London fog.',
      locationName: 'Tower Bridge, London',
      latitude: 51.5055,
      longitude: -0.0754,
      imageUrl: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=1000&q=80',
      weatherTemp: '55°F',
      weatherCondition: 'Misty',
      weatherIcon: 'cloud-fog',
      tags: '#London #TowerBridge #UK',
      authorId: amara.id,
      createdAt: new Date(Date.now() - 3600000 * 24 * 10)
    }
  });

  console.log('Database seeded successfully with 4 users and 13 echoes (7 Cape Town, 6 World)!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
