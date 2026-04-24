import pool, { initDB } from './db.js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const seedData = async () => {
  const client = await pool.connect();

  try {
    // Initialize database tables
    await initDB();

    // Clear existing data
    await client.query('TRUNCATE users, floor_plans, rooms, renovation_suggestions, materials, project_estimates, ai_analysis, design_templates, contractors, room_dimensions, full_analyses, layout_optimizations, ai_suggestions, ai_materials, room_detections, home_staging, furniture_placements, maintenance_predictions, energy_audits, home_inspections, password_reset_tokens, token_blacklist RESTART IDENTITY CASCADE');

    console.log('Seeding users...');
    // Seed Users (15+ items)
    const hashedPassword = await bcrypt.hash('password123', 10);
    const users = [
      { email: 'demo@example.com', password: hashedPassword, name: 'Demo User', role: 'admin', email_verified: true },
      { email: 'john@example.com', password: hashedPassword, name: 'John Smith', role: 'user', email_verified: true },
      { email: 'jane@example.com', password: hashedPassword, name: 'Jane Doe', role: 'editor', email_verified: true },
      { email: 'mike@example.com', password: hashedPassword, name: 'Mike Johnson', role: 'user', email_verified: true },
      { email: 'sarah@example.com', password: hashedPassword, name: 'Sarah Williams', role: 'user', email_verified: true },
      { email: 'david@example.com', password: hashedPassword, name: 'David Brown', role: 'user', email_verified: false },
      { email: 'emily@example.com', password: hashedPassword, name: 'Emily Davis', role: 'editor', email_verified: true },
      { email: 'chris@example.com', password: hashedPassword, name: 'Chris Wilson', role: 'user', email_verified: true },
      { email: 'lisa@example.com', password: hashedPassword, name: 'Lisa Anderson', role: 'user', email_verified: false },
      { email: 'tom@example.com', password: hashedPassword, name: 'Tom Taylor', role: 'user', email_verified: true },
      { email: 'amy@example.com', password: hashedPassword, name: 'Amy Martinez', role: 'user', email_verified: true },
      { email: 'kevin@example.com', password: hashedPassword, name: 'Kevin Garcia', role: 'editor', email_verified: true },
      { email: 'rachel@example.com', password: hashedPassword, name: 'Rachel Lee', role: 'user', email_verified: true },
      { email: 'brian@example.com', password: hashedPassword, name: 'Brian White', role: 'user', email_verified: false },
      { email: 'admin@example.com', password: hashedPassword, name: 'Admin User', role: 'admin', email_verified: true },
    ];

    for (const user of users) {
      await client.query(
        'INSERT INTO users (email, password, name, role, email_verified) VALUES ($1, $2, $3, $4, $5)',
        [user.email, user.password, user.name, user.role, user.email_verified]
      );
    }

    console.log('Seeding floor plans...');
    // Seed Floor Plans (15+ items)
    const floorPlans = [
      { user_id: 1, name: 'Modern Downtown Apartment', description: 'Open concept 2BR apartment in downtown area', total_area: 1200, status: 'analyzed' },
      { user_id: 1, name: 'Suburban Family Home', description: '4BR family home with large backyard', total_area: 2500, status: 'analyzed' },
      { user_id: 2, name: 'Studio Loft', description: 'Industrial style studio loft conversion', total_area: 800, status: 'pending' },
      { user_id: 2, name: 'Beach House', description: '3BR beach property with ocean views', total_area: 1800, status: 'analyzed' },
      { user_id: 3, name: 'Victorian Restoration', description: 'Historic Victorian home needing updates', total_area: 3200, status: 'in_progress' },
      { user_id: 3, name: 'Minimalist Condo', description: 'Modern minimalist 1BR condo', total_area: 650, status: 'analyzed' },
      { user_id: 4, name: 'Ranch Style Home', description: 'Single story ranch with open floor plan', total_area: 1950, status: 'pending' },
      { user_id: 4, name: 'City Penthouse', description: 'Luxury penthouse with rooftop access', total_area: 2800, status: 'analyzed' },
      { user_id: 5, name: 'Cottage Renovation', description: 'Cozy cottage needing modern updates', total_area: 1100, status: 'in_progress' },
      { user_id: 5, name: 'Contemporary Townhouse', description: 'Multi-level modern townhouse', total_area: 1650, status: 'analyzed' },
      { user_id: 6, name: 'Mid-Century Modern', description: 'Classic mid-century home restoration', total_area: 2100, status: 'pending' },
      { user_id: 6, name: 'Garden Apartment', description: 'Ground floor apartment with garden', total_area: 950, status: 'analyzed' },
      { user_id: 7, name: 'Warehouse Conversion', description: 'Industrial warehouse to residential', total_area: 3500, status: 'in_progress' },
      { user_id: 7, name: 'Colonial Revival', description: 'Traditional colonial style home', total_area: 2750, status: 'analyzed' },
      { user_id: 8, name: 'Eco-Friendly Home', description: 'Sustainable design with solar panels', total_area: 1400, status: 'pending' },
      { user_id: 1, name: 'Mountain Cabin', description: 'Rustic cabin with modern amenities', total_area: 1300, status: 'analyzed' },
    ];

    for (const fp of floorPlans) {
      await client.query(
        'INSERT INTO floor_plans (user_id, name, description, total_area, status) VALUES ($1, $2, $3, $4, $5)',
        [fp.user_id, fp.name, fp.description, fp.total_area, fp.status]
      );
    }

    console.log('Seeding rooms...');
    // Seed Rooms (15+ items per floor plan, total 50+)
    const rooms = [
      // Floor Plan 1 - Modern Downtown Apartment
      { floor_plan_id: 1, name: 'Living Room', room_type: 'living', width: 20, length: 15, area: 300 },
      { floor_plan_id: 1, name: 'Master Bedroom', room_type: 'bedroom', width: 14, length: 12, area: 168 },
      { floor_plan_id: 1, name: 'Second Bedroom', room_type: 'bedroom', width: 12, length: 10, area: 120 },
      { floor_plan_id: 1, name: 'Kitchen', room_type: 'kitchen', width: 15, length: 12, area: 180 },
      { floor_plan_id: 1, name: 'Master Bathroom', room_type: 'bathroom', width: 10, length: 8, area: 80 },
      { floor_plan_id: 1, name: 'Guest Bathroom', room_type: 'bathroom', width: 8, length: 6, area: 48 },
      { floor_plan_id: 1, name: 'Dining Area', room_type: 'dining', width: 12, length: 10, area: 120 },
      { floor_plan_id: 1, name: 'Home Office', room_type: 'office', width: 10, length: 10, area: 100 },
      // Floor Plan 2 - Suburban Family Home
      { floor_plan_id: 2, name: 'Great Room', room_type: 'living', width: 25, length: 20, area: 500 },
      { floor_plan_id: 2, name: 'Master Suite', room_type: 'bedroom', width: 18, length: 16, area: 288 },
      { floor_plan_id: 2, name: 'Kids Bedroom 1', room_type: 'bedroom', width: 14, length: 12, area: 168 },
      { floor_plan_id: 2, name: 'Kids Bedroom 2', room_type: 'bedroom', width: 14, length: 12, area: 168 },
      { floor_plan_id: 2, name: 'Guest Room', room_type: 'bedroom', width: 12, length: 12, area: 144 },
      { floor_plan_id: 2, name: 'Gourmet Kitchen', room_type: 'kitchen', width: 20, length: 15, area: 300 },
      { floor_plan_id: 2, name: 'Formal Dining', room_type: 'dining', width: 15, length: 14, area: 210 },
      { floor_plan_id: 2, name: 'Family Room', room_type: 'living', width: 18, length: 15, area: 270 },
      // Floor Plan 3 - Studio Loft
      { floor_plan_id: 3, name: 'Main Living Space', room_type: 'living', width: 30, length: 20, area: 600 },
      { floor_plan_id: 3, name: 'Sleeping Loft', room_type: 'bedroom', width: 15, length: 12, area: 180 },
      { floor_plan_id: 3, name: 'Kitchen Area', room_type: 'kitchen', width: 12, length: 10, area: 120 },
      { floor_plan_id: 3, name: 'Bathroom', room_type: 'bathroom', width: 10, length: 8, area: 80 },
      // More rooms for various floor plans
      { floor_plan_id: 4, name: 'Ocean View Living', room_type: 'living', width: 22, length: 18, area: 396 },
      { floor_plan_id: 4, name: 'Beach Master', room_type: 'bedroom', width: 16, length: 14, area: 224 },
      { floor_plan_id: 4, name: 'Coastal Kitchen', room_type: 'kitchen', width: 16, length: 14, area: 224 },
      { floor_plan_id: 5, name: 'Victorian Parlor', room_type: 'living', width: 20, length: 18, area: 360 },
      { floor_plan_id: 5, name: 'Library', room_type: 'office', width: 15, length: 12, area: 180 },
      { floor_plan_id: 5, name: 'Grand Foyer', room_type: 'entry', width: 12, length: 10, area: 120 },
      { floor_plan_id: 6, name: 'Open Living', room_type: 'living', width: 18, length: 14, area: 252 },
      { floor_plan_id: 6, name: 'Compact Kitchen', room_type: 'kitchen', width: 12, length: 10, area: 120 },
      { floor_plan_id: 7, name: 'Great Room', room_type: 'living', width: 24, length: 20, area: 480 },
      { floor_plan_id: 7, name: 'Ranch Master', room_type: 'bedroom', width: 16, length: 14, area: 224 },
      { floor_plan_id: 8, name: 'Penthouse Living', room_type: 'living', width: 30, length: 25, area: 750 },
      { floor_plan_id: 8, name: 'Rooftop Terrace', room_type: 'outdoor', width: 40, length: 30, area: 1200 },
    ];

    for (const room of rooms) {
      await client.query(
        'INSERT INTO rooms (floor_plan_id, name, room_type, width, length, area) VALUES ($1, $2, $3, $4, $5, $6)',
        [room.floor_plan_id, room.name, room.room_type, room.width, room.length, room.area]
      );
    }

    console.log('Seeding renovation suggestions...');
    // Seed Renovation Suggestions (15+ items)
    const suggestions = [
      { floor_plan_id: 1, room_id: 1, title: 'Open Concept Kitchen Expansion', description: 'Remove wall between kitchen and living room for modern open concept', category: 'structural', priority: 'high', estimated_cost: 15000, difficulty: 'complex', timeline: '2-3 weeks', ai_generated: true },
      { floor_plan_id: 1, room_id: 4, title: 'Kitchen Island Addition', description: 'Add central island with waterfall countertop for prep space', category: 'kitchen', priority: 'medium', estimated_cost: 8000, difficulty: 'moderate', timeline: '1 week', ai_generated: true },
      { floor_plan_id: 1, room_id: 5, title: 'Spa-Style Bathroom Upgrade', description: 'Transform master bath with rain shower and freestanding tub', category: 'bathroom', priority: 'medium', estimated_cost: 12000, difficulty: 'moderate', timeline: '2 weeks', ai_generated: true },
      { floor_plan_id: 2, room_id: 9, title: 'Smart Home Integration', description: 'Install smart lighting, thermostat, and security system', category: 'technology', priority: 'low', estimated_cost: 5000, difficulty: 'easy', timeline: '3 days', ai_generated: true },
      { floor_plan_id: 2, room_id: 14, title: 'Kitchen Modernization', description: 'Update cabinets, countertops, and appliances', category: 'kitchen', priority: 'high', estimated_cost: 35000, difficulty: 'complex', timeline: '4-6 weeks', ai_generated: true },
      { floor_plan_id: 3, room_id: 17, title: 'Industrial Lighting Design', description: 'Install exposed bulb fixtures and track lighting', category: 'lighting', priority: 'medium', estimated_cost: 3000, difficulty: 'easy', timeline: '2 days', ai_generated: true },
      { floor_plan_id: 3, room_id: 18, title: 'Loft Bedroom Privacy', description: 'Add sliding barn doors or curtain partition', category: 'structural', priority: 'high', estimated_cost: 2500, difficulty: 'easy', timeline: '1 day', ai_generated: true },
      { floor_plan_id: 4, room_id: 21, title: 'Coastal Window Treatment', description: 'Install UV-blocking windows with ocean view optimization', category: 'windows', priority: 'medium', estimated_cost: 8500, difficulty: 'moderate', timeline: '1 week', ai_generated: true },
      { floor_plan_id: 5, room_id: 24, title: 'Victorian Crown Molding', description: 'Restore original crown molding and add period details', category: 'trim', priority: 'high', estimated_cost: 6000, difficulty: 'moderate', timeline: '1-2 weeks', ai_generated: true },
      { floor_plan_id: 5, room_id: 25, title: 'Built-in Bookshelves', description: 'Custom floor-to-ceiling library shelving', category: 'storage', priority: 'medium', estimated_cost: 7500, difficulty: 'moderate', timeline: '1 week', ai_generated: true },
      { floor_plan_id: 6, room_id: 27, title: 'Minimalist Built-ins', description: 'Concealed storage with clean lines', category: 'storage', priority: 'low', estimated_cost: 4500, difficulty: 'moderate', timeline: '4 days', ai_generated: true },
      { floor_plan_id: 7, room_id: 29, title: 'Vaulted Ceiling Installation', description: 'Open up ceiling for dramatic height', category: 'structural', priority: 'high', estimated_cost: 25000, difficulty: 'complex', timeline: '3-4 weeks', ai_generated: true },
      { floor_plan_id: 8, room_id: 31, title: 'Floor-to-Ceiling Windows', description: 'Maximize city views with expansive glass', category: 'windows', priority: 'high', estimated_cost: 45000, difficulty: 'complex', timeline: '2-3 weeks', ai_generated: true },
      { floor_plan_id: 8, room_id: 32, title: 'Rooftop Kitchen Setup', description: 'Outdoor kitchen with built-in grill', category: 'outdoor', priority: 'medium', estimated_cost: 20000, difficulty: 'moderate', timeline: '2 weeks', ai_generated: true },
      { floor_plan_id: 1, room_id: 8, title: 'Home Office Soundproofing', description: 'Acoustic panels and double-pane windows', category: 'acoustic', priority: 'medium', estimated_cost: 3500, difficulty: 'moderate', timeline: '3 days', ai_generated: true },
      { floor_plan_id: 2, room_id: 11, title: 'Kids Room Built-in Desk', description: 'Custom study area with shelving', category: 'furniture', priority: 'low', estimated_cost: 2000, difficulty: 'easy', timeline: '2 days', ai_generated: true },
    ];

    for (const s of suggestions) {
      await client.query(
        'INSERT INTO renovation_suggestions (floor_plan_id, room_id, title, description, category, priority, estimated_cost, difficulty, timeline, ai_generated) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
        [s.floor_plan_id, s.room_id, s.title, s.description, s.category, s.priority, s.estimated_cost, s.difficulty, s.timeline, s.ai_generated]
      );
    }

    console.log('Seeding materials...');
    // Seed Materials (15+ items)
    const materials = [
      { name: 'Hardwood Flooring - Oak', category: 'flooring', description: 'Premium solid oak hardwood flooring', unit_price: 8.50, unit: 'sqft', supplier: 'Lumber Liquidators', in_stock: true },
      { name: 'Quartz Countertop - Calacatta', category: 'countertop', description: 'Engineered quartz with marble look', unit_price: 85.00, unit: 'sqft', supplier: 'Stone World', in_stock: true },
      { name: 'Subway Tile - White Ceramic', category: 'tile', description: 'Classic 3x6 white subway tiles', unit_price: 2.50, unit: 'sqft', supplier: 'Tile Depot', in_stock: true },
      { name: 'Shaker Cabinet - White', category: 'cabinet', description: 'Solid wood shaker style cabinets', unit_price: 250.00, unit: 'unit', supplier: 'Cabinet Pro', in_stock: true },
      { name: 'Granite Countertop - Black Galaxy', category: 'countertop', description: 'Natural granite with gold flecks', unit_price: 65.00, unit: 'sqft', supplier: 'Stone World', in_stock: false },
      { name: 'Vinyl Plank - Waterproof', category: 'flooring', description: 'Luxury vinyl plank, waterproof core', unit_price: 4.25, unit: 'sqft', supplier: 'Floor & Decor', in_stock: true },
      { name: 'Paint - Premium Interior', category: 'paint', description: 'Low VOC premium interior paint', unit_price: 55.00, unit: 'gallon', supplier: 'Sherwin Williams', in_stock: true },
      { name: 'Recessed Lighting Kit', category: 'lighting', description: '6-inch LED recessed light package', unit_price: 35.00, unit: 'unit', supplier: 'Home Lighting Co', in_stock: true },
      { name: 'Porcelain Tile - Large Format', category: 'tile', description: '24x24 porcelain floor tile', unit_price: 5.75, unit: 'sqft', supplier: 'Tile Depot', in_stock: true },
      { name: 'Stainless Steel Appliance Set', category: 'appliance', description: 'Refrigerator, range, dishwasher combo', unit_price: 3500.00, unit: 'set', supplier: 'Appliance Direct', in_stock: true },
      { name: 'Frameless Glass Shower', category: 'bathroom', description: 'Custom frameless shower enclosure', unit_price: 1200.00, unit: 'unit', supplier: 'Glass Masters', in_stock: true },
      { name: 'Barn Door - Sliding', category: 'door', description: 'Rustic wood sliding barn door with hardware', unit_price: 450.00, unit: 'unit', supplier: 'Door World', in_stock: true },
      { name: 'Crown Molding - Victorian', category: 'trim', description: 'Ornate plaster crown molding', unit_price: 12.00, unit: 'linear ft', supplier: 'Trim Masters', in_stock: true },
      { name: 'Smart Thermostat', category: 'smart home', description: 'WiFi enabled learning thermostat', unit_price: 250.00, unit: 'unit', supplier: 'Tech Home', in_stock: true },
      { name: 'Undermount Sink - Double', category: 'plumbing', description: 'Stainless steel double bowl sink', unit_price: 350.00, unit: 'unit', supplier: 'Plumbing Plus', in_stock: true },
      { name: 'Marble Tile - Carrara', category: 'tile', description: 'Authentic Italian Carrara marble', unit_price: 18.00, unit: 'sqft', supplier: 'Stone World', in_stock: true },
    ];

    for (const m of materials) {
      await client.query(
        'INSERT INTO materials (name, category, description, unit_price, unit, supplier, in_stock) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [m.name, m.category, m.description, m.unit_price, m.unit, m.supplier, m.in_stock]
      );
    }

    console.log('Seeding project estimates...');
    // Seed Project Estimates (15+ items)
    const estimates = [
      { floor_plan_id: 1, name: 'Full Apartment Renovation', description: 'Complete update of all rooms', labor_cost: 25000, material_cost: 35000, total_cost: 60000, timeline_days: 45, status: 'approved' },
      { floor_plan_id: 1, name: 'Kitchen Remodel Only', description: 'Modern kitchen update', labor_cost: 8000, material_cost: 15000, total_cost: 23000, timeline_days: 14, status: 'draft' },
      { floor_plan_id: 2, name: 'Master Suite Upgrade', description: 'Bedroom and bathroom renovation', labor_cost: 12000, material_cost: 18000, total_cost: 30000, timeline_days: 21, status: 'pending' },
      { floor_plan_id: 2, name: 'Whole House Smart Home', description: 'Full smart home installation', labor_cost: 5000, material_cost: 8000, total_cost: 13000, timeline_days: 7, status: 'approved' },
      { floor_plan_id: 3, name: 'Loft Modernization', description: 'Industrial to modern conversion', labor_cost: 15000, material_cost: 20000, total_cost: 35000, timeline_days: 30, status: 'in_progress' },
      { floor_plan_id: 4, name: 'Coastal Living Update', description: 'Beach house refresh', labor_cost: 10000, material_cost: 12000, total_cost: 22000, timeline_days: 18, status: 'draft' },
      { floor_plan_id: 5, name: 'Victorian Restoration', description: 'Period-accurate restoration', labor_cost: 45000, material_cost: 55000, total_cost: 100000, timeline_days: 90, status: 'pending' },
      { floor_plan_id: 6, name: 'Minimalist Makeover', description: 'Clean and simple update', labor_cost: 6000, material_cost: 8000, total_cost: 14000, timeline_days: 10, status: 'approved' },
      { floor_plan_id: 7, name: 'Ranch Modernization', description: 'Open concept conversion', labor_cost: 20000, material_cost: 25000, total_cost: 45000, timeline_days: 35, status: 'draft' },
      { floor_plan_id: 8, name: 'Penthouse Luxury Upgrade', description: 'High-end finishes throughout', labor_cost: 60000, material_cost: 90000, total_cost: 150000, timeline_days: 60, status: 'pending' },
      { floor_plan_id: 1, name: 'Bathroom Refresh', description: 'Both bathrooms updated', labor_cost: 5000, material_cost: 8000, total_cost: 13000, timeline_days: 10, status: 'completed' },
      { floor_plan_id: 2, name: 'Kitchen Island Addition', description: 'New island installation', labor_cost: 3000, material_cost: 5000, total_cost: 8000, timeline_days: 5, status: 'completed' },
      { floor_plan_id: 3, name: 'Lighting Upgrade', description: 'Industrial lighting package', labor_cost: 1500, material_cost: 3000, total_cost: 4500, timeline_days: 3, status: 'approved' },
      { floor_plan_id: 4, name: 'Window Replacement', description: 'Hurricane-rated windows', labor_cost: 4000, material_cost: 12000, total_cost: 16000, timeline_days: 7, status: 'in_progress' },
      { floor_plan_id: 5, name: 'Library Built-ins', description: 'Custom bookshelves', labor_cost: 4000, material_cost: 3500, total_cost: 7500, timeline_days: 7, status: 'draft' },
      { floor_plan_id: 6, name: 'Flooring Update', description: 'New hardwood floors', labor_cost: 2000, material_cost: 4000, total_cost: 6000, timeline_days: 4, status: 'pending' },
    ];

    for (const e of estimates) {
      await client.query(
        'INSERT INTO project_estimates (floor_plan_id, name, description, labor_cost, material_cost, total_cost, timeline_days, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [e.floor_plan_id, e.name, e.description, e.labor_cost, e.material_cost, e.total_cost, e.timeline_days, e.status]
      );
    }

    console.log('Seeding design templates...');
    // Seed Design Templates (15+ items)
    const templates = [
      { name: 'Modern Minimalist', style: 'minimalist', description: 'Clean lines and neutral colors', room_type: 'living', features: JSON.stringify(['open space', 'minimal furniture', 'neutral palette']), color_palette: JSON.stringify(['#FFFFFF', '#F5F5F5', '#333333', '#E0E0E0']) },
      { name: 'Industrial Chic', style: 'industrial', description: 'Exposed brick and metal accents', room_type: 'living', features: JSON.stringify(['exposed brick', 'metal fixtures', 'reclaimed wood']), color_palette: JSON.stringify(['#8B4513', '#708090', '#2F4F4F', '#D2691E']) },
      { name: 'Coastal Retreat', style: 'coastal', description: 'Beach-inspired relaxation', room_type: 'bedroom', features: JSON.stringify(['light colors', 'natural textures', 'ocean accents']), color_palette: JSON.stringify(['#87CEEB', '#FFFFFF', '#F5DEB3', '#20B2AA']) },
      { name: 'Scandinavian Simple', style: 'scandinavian', description: 'Nordic simplicity and warmth', room_type: 'living', features: JSON.stringify(['hygge elements', 'natural wood', 'cozy textiles']), color_palette: JSON.stringify(['#FFFFFF', '#E8E4E1', '#B8A99A', '#3D3D3D']) },
      { name: 'Farmhouse Fresh', style: 'farmhouse', description: 'Rustic charm with modern comfort', room_type: 'kitchen', features: JSON.stringify(['shiplap', 'apron sink', 'open shelving']), color_palette: JSON.stringify(['#FFFFFF', '#F5F5DC', '#8B7355', '#2F4F4F']) },
      { name: 'Mid-Century Modern', style: 'mid-century', description: '1950s inspired design', room_type: 'living', features: JSON.stringify(['iconic furniture', 'bold colors', 'organic shapes']), color_palette: JSON.stringify(['#FF6B35', '#004E89', '#1A659E', '#FFFACD']) },
      { name: 'Bohemian Eclectic', style: 'bohemian', description: 'Free-spirited and colorful', room_type: 'bedroom', features: JSON.stringify(['layered textiles', 'global accents', 'plants']), color_palette: JSON.stringify(['#8B0000', '#FFD700', '#006400', '#4B0082']) },
      { name: 'Contemporary Luxury', style: 'luxury', description: 'High-end modern elegance', room_type: 'living', features: JSON.stringify(['premium materials', 'custom furniture', 'art pieces']), color_palette: JSON.stringify(['#1C1C1C', '#C0C0C0', '#FFD700', '#FFFFFF']) },
      { name: 'Traditional Classic', style: 'traditional', description: 'Timeless elegance', room_type: 'dining', features: JSON.stringify(['crown molding', 'formal furniture', 'rich fabrics']), color_palette: JSON.stringify(['#8B0000', '#FFD700', '#2F4F4F', '#F5F5DC']) },
      { name: 'Japanese Zen', style: 'japanese', description: 'Peaceful and balanced', room_type: 'bedroom', features: JSON.stringify(['low furniture', 'natural materials', 'minimal decor']), color_palette: JSON.stringify(['#F5F5DC', '#8B7355', '#228B22', '#1C1C1C']) },
      { name: 'Art Deco Glam', style: 'art-deco', description: '1920s glamour revival', room_type: 'living', features: JSON.stringify(['geometric patterns', 'gold accents', 'velvet']), color_palette: JSON.stringify(['#1C1C1C', '#FFD700', '#006400', '#800020']) },
      { name: 'Rustic Mountain', style: 'rustic', description: 'Cabin-inspired warmth', room_type: 'living', features: JSON.stringify(['stone fireplace', 'wood beams', 'cozy textures']), color_palette: JSON.stringify(['#8B4513', '#2F4F4F', '#D2691E', '#F5DEB3']) },
      { name: 'Urban Loft', style: 'urban', description: 'City living optimized', room_type: 'living', features: JSON.stringify(['open plan', 'concrete floors', 'modern art']), color_palette: JSON.stringify(['#696969', '#FFFFFF', '#FF4500', '#1C1C1C']) },
      { name: 'French Country', style: 'french', description: 'Provencal charm', room_type: 'kitchen', features: JSON.stringify(['toile patterns', 'distressed wood', 'copper accents']), color_palette: JSON.stringify(['#E6E6FA', '#F5F5DC', '#87CEEB', '#FFD700']) },
      { name: 'Tropical Paradise', style: 'tropical', description: 'Resort-style relaxation', room_type: 'bedroom', features: JSON.stringify(['bold prints', 'rattan', 'lush plants']), color_palette: JSON.stringify(['#228B22', '#FF6B35', '#FFD700', '#FFFFFF']) },
      { name: 'Mediterranean Warmth', style: 'mediterranean', description: 'Tuscan-inspired comfort', room_type: 'dining', features: JSON.stringify(['terracotta', 'wrought iron', 'olive tones']), color_palette: JSON.stringify(['#CD853F', '#8B4513', '#228B22', '#87CEEB']) },
    ];

    for (const t of templates) {
      await client.query(
        'INSERT INTO design_templates (name, style, description, room_type, features, color_palette) VALUES ($1, $2, $3, $4, $5, $6)',
        [t.name, t.style, t.description, t.room_type, t.features, t.color_palette]
      );
    }

    console.log('Seeding contractors...');
    // Seed Contractors (15+ items)
    const contractors = [
      { name: 'John Builder', company: 'BuildRight Construction', specialty: 'general', email: 'john@buildright.com', phone: '555-0101', rating: 4.8, hourly_rate: 75, availability: 'available', location: 'Downtown', verified: true },
      { name: 'Sarah Plumb', company: 'Premier Plumbing', specialty: 'plumbing', email: 'sarah@premierplumb.com', phone: '555-0102', rating: 4.9, hourly_rate: 85, availability: 'available', location: 'Midtown', verified: true },
      { name: 'Mike Sparks', company: 'Electric Solutions', specialty: 'electrical', email: 'mike@elecsol.com', phone: '555-0103', rating: 4.7, hourly_rate: 80, availability: 'busy', location: 'Suburbs', verified: true },
      { name: 'Lisa Floors', company: 'Floor Masters', specialty: 'flooring', email: 'lisa@floormasters.com', phone: '555-0104', rating: 4.6, hourly_rate: 65, availability: 'available', location: 'Downtown', verified: true },
      { name: 'Tom Paint', company: 'Color Pro Painting', specialty: 'painting', email: 'tom@colorpro.com', phone: '555-0105', rating: 4.5, hourly_rate: 55, availability: 'available', location: 'Eastside', verified: false },
      { name: 'Amy Kitchen', company: 'Kitchen Creations', specialty: 'kitchen', email: 'amy@kitchencreate.com', phone: '555-0106', rating: 4.9, hourly_rate: 90, availability: 'busy', location: 'Midtown', verified: true },
      { name: 'Chris Bath', company: 'Bath Renovators', specialty: 'bathroom', email: 'chris@bathrenov.com', phone: '555-0107', rating: 4.7, hourly_rate: 85, availability: 'available', location: 'Westside', verified: true },
      { name: 'David HVAC', company: 'Climate Control Co', specialty: 'hvac', email: 'david@climatecontrol.com', phone: '555-0108', rating: 4.8, hourly_rate: 95, availability: 'available', location: 'Suburbs', verified: true },
      { name: 'Emma Roof', company: 'Top Roofing', specialty: 'roofing', email: 'emma@toproofing.com', phone: '555-0109', rating: 4.6, hourly_rate: 70, availability: 'busy', location: 'Northside', verified: true },
      { name: 'Frank Windows', company: 'Clear View Windows', specialty: 'windows', email: 'frank@clearview.com', phone: '555-0110', rating: 4.4, hourly_rate: 60, availability: 'available', location: 'Downtown', verified: false },
      { name: 'Grace Tile', company: 'Tile Artisans', specialty: 'tile', email: 'grace@tileartisans.com', phone: '555-0111', rating: 4.9, hourly_rate: 75, availability: 'available', location: 'Midtown', verified: true },
      { name: 'Henry Carpentry', company: 'Fine Woodworks', specialty: 'carpentry', email: 'henry@finewood.com', phone: '555-0112', rating: 4.8, hourly_rate: 80, availability: 'busy', location: 'Eastside', verified: true },
      { name: 'Ivy Design', company: 'Interior Dreams', specialty: 'interior design', email: 'ivy@interiordreams.com', phone: '555-0113', rating: 4.7, hourly_rate: 100, availability: 'available', location: 'Downtown', verified: true },
      { name: 'Jack Mason', company: 'Stone & Brick Co', specialty: 'masonry', email: 'jack@stonebrick.com', phone: '555-0114', rating: 4.5, hourly_rate: 70, availability: 'available', location: 'Suburbs', verified: false },
      { name: 'Kate Landscape', company: 'Green Gardens', specialty: 'landscaping', email: 'kate@greengardens.com', phone: '555-0115', rating: 4.6, hourly_rate: 55, availability: 'available', location: 'Westside', verified: true },
      { name: 'Leo Smart', company: 'Home Automation Pro', specialty: 'smart home', email: 'leo@homeauto.com', phone: '555-0116', rating: 4.8, hourly_rate: 90, availability: 'busy', location: 'Downtown', verified: true },
    ];

    for (const c of contractors) {
      await client.query(
        'INSERT INTO contractors (name, company, specialty, email, phone, rating, hourly_rate, availability, location, verified) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
        [c.name, c.company, c.specialty, c.email, c.phone, c.rating, c.hourly_rate, c.availability, c.location, c.verified]
      );
    }

    console.log('Seeding room detections...');
    // Seed Room Detections (15+ items)
    const roomDetections = [
      { floor_plan_id: 1, detected_rooms: JSON.stringify([{name: 'Living Room', type: 'living', area: 300}, {name: 'Kitchen', type: 'kitchen', area: 180}]), total_rooms: 6, confidence_score: 92.5, full_result: '## Room Detection Analysis\n\nDetected 6 rooms with high confidence.' },
      { floor_plan_id: 2, detected_rooms: JSON.stringify([{name: 'Master Suite', type: 'bedroom', area: 288}, {name: 'Kitchen', type: 'kitchen', area: 300}]), total_rooms: 8, confidence_score: 88.0, full_result: '## Room Detection Analysis\n\nDetected 8 rooms in this family home.' },
      { floor_plan_id: 3, detected_rooms: JSON.stringify([{name: 'Main Living Space', type: 'living', area: 600}]), total_rooms: 3, confidence_score: 95.0, full_result: '## Room Detection Analysis\n\nOpen concept loft with 3 distinct areas.' },
      { floor_plan_id: 4, detected_rooms: JSON.stringify([{name: 'Ocean View Living', type: 'living', area: 396}]), total_rooms: 5, confidence_score: 90.5, full_result: '## Room Detection Analysis\n\n5 rooms identified in beach property.' },
      { floor_plan_id: 5, detected_rooms: JSON.stringify([{name: 'Victorian Parlor', type: 'living', area: 360}]), total_rooms: 7, confidence_score: 85.0, full_result: '## Room Detection Analysis\n\n7 rooms in Victorian layout.' },
      { floor_plan_id: 6, detected_rooms: JSON.stringify([{name: 'Open Living', type: 'living', area: 252}]), total_rooms: 3, confidence_score: 94.0, full_result: '## Room Detection Analysis\n\nMinimalist 3-room layout.' },
      { floor_plan_id: 7, detected_rooms: JSON.stringify([{name: 'Great Room', type: 'living', area: 480}]), total_rooms: 6, confidence_score: 87.5, full_result: '## Room Detection Analysis\n\nRanch style with 6 rooms.' },
      { floor_plan_id: 8, detected_rooms: JSON.stringify([{name: 'Penthouse Living', type: 'living', area: 750}]), total_rooms: 5, confidence_score: 91.0, full_result: '## Room Detection Analysis\n\nLuxury penthouse with 5 main areas.' },
      { floor_plan_id: 1, detected_rooms: JSON.stringify([{name: 'Master Bedroom', type: 'bedroom', area: 168}]), total_rooms: 6, confidence_score: 93.5, full_result: '## Updated Room Detection\n\nRe-analyzed with improved accuracy.' },
      { floor_plan_id: 2, detected_rooms: JSON.stringify([{name: 'Family Room', type: 'living', area: 270}]), total_rooms: 8, confidence_score: 89.0, full_result: '## Room Detection\n\nComplete family home analysis.' },
      { floor_plan_id: 16, detected_rooms: JSON.stringify([{name: 'Cabin Living', type: 'living', area: 400}]), total_rooms: 4, confidence_score: 86.5, full_result: '## Room Detection\n\nMountain cabin with 4 rooms.' },
      { floor_plan_id: 9, detected_rooms: JSON.stringify([{name: 'Cottage Living', type: 'living', area: 320}]), total_rooms: 4, confidence_score: 88.5, full_result: '## Room Detection\n\nCozy cottage layout identified.' },
      { floor_plan_id: 10, detected_rooms: JSON.stringify([{name: 'Townhouse Main', type: 'living', area: 450}]), total_rooms: 6, confidence_score: 90.0, full_result: '## Room Detection\n\nMulti-level townhouse analysis.' },
      { floor_plan_id: 11, detected_rooms: JSON.stringify([{name: 'Mid-Century Living', type: 'living', area: 520}]), total_rooms: 5, confidence_score: 87.0, full_result: '## Room Detection\n\nClassic mid-century layout.' },
      { floor_plan_id: 12, detected_rooms: JSON.stringify([{name: 'Garden Unit', type: 'living', area: 280}]), total_rooms: 4, confidence_score: 92.0, full_result: '## Room Detection\n\nGarden apartment rooms identified.' },
    ];

    for (const rd of roomDetections) {
      await client.query(
        'INSERT INTO room_detections (floor_plan_id, detected_rooms, total_rooms, confidence_score, full_result, model_used) VALUES ($1, $2, $3, $4, $5, $6)',
        [rd.floor_plan_id, rd.detected_rooms, rd.total_rooms, rd.confidence_score, rd.full_result, 'anthropic/claude-haiku-4.5']
      );
    }

    console.log('Seeding home staging...');
    // Seed Home Staging (15+ items)
    const homeStagingData = [
      { floor_plan_id: 1, room_id: 1, staging_style: 'Modern Minimalist', target_buyer: 'young professionals', estimated_value_increase: 15000, recommendations: JSON.stringify([{item: 'Neutral sofa', cost: 800}, {item: 'Abstract art', cost: 200}]), full_result: '## Home Staging Recommendations\n\n### Modern Minimalist Style\n\nTarget: Young Professionals' },
      { floor_plan_id: 1, room_id: 4, staging_style: 'Contemporary Chef', target_buyer: 'food enthusiasts', estimated_value_increase: 12000, recommendations: JSON.stringify([{item: 'Modern pendant lights', cost: 400}, {item: 'Fresh herbs display', cost: 50}]), full_result: '## Kitchen Staging\n\nAppeal to culinary enthusiasts.' },
      { floor_plan_id: 2, room_id: 9, staging_style: 'Family Friendly', target_buyer: 'families with children', estimated_value_increase: 25000, recommendations: JSON.stringify([{item: 'Comfortable sectional', cost: 1500}, {item: 'Built-in storage', cost: 800}]), full_result: '## Family Room Staging\n\nWarm and inviting for families.' },
      { floor_plan_id: 2, room_id: 10, staging_style: 'Luxury Retreat', target_buyer: 'luxury seekers', estimated_value_increase: 18000, recommendations: JSON.stringify([{item: 'King bed with upholstered headboard', cost: 2000}]), full_result: '## Master Suite Staging\n\nCreate a luxury retreat.' },
      { floor_plan_id: 3, room_id: 17, staging_style: 'Urban Industrial', target_buyer: 'young creatives', estimated_value_increase: 8000, recommendations: JSON.stringify([{item: 'Exposed bulb fixtures', cost: 300}]), full_result: '## Loft Staging\n\nIndustrial chic appeal.' },
      { floor_plan_id: 4, room_id: 21, staging_style: 'Coastal Casual', target_buyer: 'vacation home buyers', estimated_value_increase: 20000, recommendations: JSON.stringify([{item: 'Linen furniture', cost: 1200}]), full_result: '## Beach House Staging\n\nRelaxed coastal vibe.' },
      { floor_plan_id: 5, room_id: 24, staging_style: 'Victorian Elegance', target_buyer: 'historic home lovers', estimated_value_increase: 30000, recommendations: JSON.stringify([{item: 'Period-appropriate furniture', cost: 3000}]), full_result: '## Victorian Staging\n\nTimeless elegance.' },
      { floor_plan_id: 6, room_id: 27, staging_style: 'Scandinavian Simple', target_buyer: 'minimalists', estimated_value_increase: 10000, recommendations: JSON.stringify([{item: 'Clean-lined furniture', cost: 900}]), full_result: '## Minimalist Staging\n\nLess is more approach.' },
      { floor_plan_id: 7, room_id: 29, staging_style: 'Ranch Modern', target_buyer: 'suburban families', estimated_value_increase: 22000, recommendations: JSON.stringify([{item: 'Open shelving', cost: 600}]), full_result: '## Ranch Staging\n\nModern suburban appeal.' },
      { floor_plan_id: 8, room_id: 31, staging_style: 'Penthouse Luxury', target_buyer: 'high-net-worth individuals', estimated_value_increase: 50000, recommendations: JSON.stringify([{item: 'Designer furniture', cost: 10000}]), full_result: '## Penthouse Staging\n\nUltra-luxury presentation.' },
      { floor_plan_id: 1, room_id: 2, staging_style: 'Serene Bedroom', target_buyer: 'professionals', estimated_value_increase: 8000, recommendations: JSON.stringify([{item: 'Quality bedding', cost: 500}]), full_result: '## Bedroom Staging\n\nPeaceful retreat.' },
      { floor_plan_id: 2, room_id: 14, staging_style: 'Gourmet Kitchen', target_buyer: 'home chefs', estimated_value_increase: 28000, recommendations: JSON.stringify([{item: 'Professional range display', cost: 0}]), full_result: '## Kitchen Staging\n\nChef-ready presentation.' },
      { floor_plan_id: 1, room_id: 5, staging_style: 'Spa Bathroom', target_buyer: 'wellness focused', estimated_value_increase: 6000, recommendations: JSON.stringify([{item: 'Luxury towels', cost: 150}]), full_result: '## Bathroom Staging\n\nSpa-like experience.' },
      { floor_plan_id: 1, room_id: 8, staging_style: 'Home Office', target_buyer: 'remote workers', estimated_value_increase: 5000, recommendations: JSON.stringify([{item: 'Ergonomic setup', cost: 800}]), full_result: '## Office Staging\n\nProductive workspace.' },
      { floor_plan_id: 8, room_id: 32, staging_style: 'Outdoor Living', target_buyer: 'entertainers', estimated_value_increase: 35000, recommendations: JSON.stringify([{item: 'Outdoor furniture set', cost: 3000}]), full_result: '## Rooftop Staging\n\nEntertainment paradise.' },
    ];

    for (const hs of homeStagingData) {
      await client.query(
        'INSERT INTO home_staging (floor_plan_id, room_id, staging_style, target_buyer, estimated_value_increase, recommendations, full_result, model_used) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [hs.floor_plan_id, hs.room_id, hs.staging_style, hs.target_buyer, hs.estimated_value_increase, hs.recommendations, hs.full_result, 'anthropic/claude-haiku-4.5']
      );
    }

    console.log('Seeding furniture placements...');
    // Seed Furniture Placements (15+ items)
    const furniturePlacements = [
      { floor_plan_id: 1, room_id: 1, layout_score: 8.5, traffic_flow_rating: 'excellent', furniture_items: JSON.stringify([{name: 'Sectional Sofa', position_x: 24, position_y: 48}, {name: 'Coffee Table', position_x: 60, position_y: 72}]), full_result: '## Furniture Layout Plan\n\n### Living Room\nOptimal placement for conversation and TV viewing.' },
      { floor_plan_id: 1, room_id: 2, layout_score: 9.0, traffic_flow_rating: 'excellent', furniture_items: JSON.stringify([{name: 'King Bed', position_x: 72, position_y: 36}, {name: 'Dresser', position_x: 12, position_y: 24}]), full_result: '## Bedroom Layout\n\nBed positioned for natural light.' },
      { floor_plan_id: 2, room_id: 9, layout_score: 8.0, traffic_flow_rating: 'good', furniture_items: JSON.stringify([{name: 'L-Shaped Sectional', position_x: 48, position_y: 60}]), full_result: '## Great Room Layout\n\nOpen concept furniture arrangement.' },
      { floor_plan_id: 2, room_id: 10, layout_score: 8.8, traffic_flow_rating: 'excellent', furniture_items: JSON.stringify([{name: 'California King', position_x: 84, position_y: 48}]), full_result: '## Master Suite Layout\n\nLuxurious bedroom arrangement.' },
      { floor_plan_id: 3, room_id: 17, layout_score: 7.5, traffic_flow_rating: 'good', furniture_items: JSON.stringify([{name: 'Modular Sofa', position_x: 36, position_y: 48}]), full_result: '## Loft Layout\n\nFlexible open space arrangement.' },
      { floor_plan_id: 4, room_id: 21, layout_score: 8.2, traffic_flow_rating: 'good', furniture_items: JSON.stringify([{name: 'Coastal Sectional', position_x: 48, position_y: 36}]), full_result: '## Beach Living Layout\n\nOcean view optimization.' },
      { floor_plan_id: 5, room_id: 24, layout_score: 7.8, traffic_flow_rating: 'good', furniture_items: JSON.stringify([{name: 'Victorian Sofa', position_x: 36, position_y: 48}]), full_result: '## Parlor Layout\n\nPeriod-appropriate arrangement.' },
      { floor_plan_id: 6, room_id: 27, layout_score: 9.2, traffic_flow_rating: 'excellent', furniture_items: JSON.stringify([{name: 'Minimal Sofa', position_x: 24, position_y: 36}]), full_result: '## Minimalist Layout\n\nClean and efficient.' },
      { floor_plan_id: 7, room_id: 29, layout_score: 8.3, traffic_flow_rating: 'good', furniture_items: JSON.stringify([{name: 'Comfortable Sectional', position_x: 60, position_y: 48}]), full_result: '## Ranch Layout\n\nFamily-friendly arrangement.' },
      { floor_plan_id: 8, room_id: 31, layout_score: 9.5, traffic_flow_rating: 'excellent', furniture_items: JSON.stringify([{name: 'Designer Sofa', position_x: 72, position_y: 60}]), full_result: '## Penthouse Layout\n\nLuxury furniture placement.' },
      { floor_plan_id: 1, room_id: 4, layout_score: 8.0, traffic_flow_rating: 'good', furniture_items: JSON.stringify([{name: 'Kitchen Island', position_x: 48, position_y: 36}]), full_result: '## Kitchen Layout\n\nWork triangle optimization.' },
      { floor_plan_id: 2, room_id: 14, layout_score: 8.5, traffic_flow_rating: 'good', furniture_items: JSON.stringify([{name: 'Large Island', position_x: 60, position_y: 48}]), full_result: '## Gourmet Kitchen\n\nChef-friendly layout.' },
      { floor_plan_id: 1, room_id: 8, layout_score: 8.7, traffic_flow_rating: 'excellent', furniture_items: JSON.stringify([{name: 'L-Desk', position_x: 24, position_y: 12}]), full_result: '## Home Office\n\nProductivity-focused layout.' },
      { floor_plan_id: 5, room_id: 25, layout_score: 8.0, traffic_flow_rating: 'good', furniture_items: JSON.stringify([{name: 'Reading Chair', position_x: 36, position_y: 24}]), full_result: '## Library Layout\n\nCozy reading nook.' },
      { floor_plan_id: 8, room_id: 32, layout_score: 8.8, traffic_flow_rating: 'excellent', furniture_items: JSON.stringify([{name: 'Outdoor Sectional', position_x: 96, position_y: 72}]), full_result: '## Rooftop Layout\n\nEntertainment optimization.' },
    ];

    for (const fp of furniturePlacements) {
      await client.query(
        'INSERT INTO furniture_placements (floor_plan_id, room_id, layout_score, traffic_flow_rating, furniture_items, full_result, model_used) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [fp.floor_plan_id, fp.room_id, fp.layout_score, fp.traffic_flow_rating, fp.furniture_items, fp.full_result, 'anthropic/claude-haiku-4.5']
      );
    }

    console.log('Seeding maintenance predictions...');
    // Seed Maintenance Predictions (15+ items)
    const maintenancePredictions = [
      { floor_plan_id: 1, total_annual_cost: 3500, priority_items: 4, next_maintenance_date: '2024-03-15', predictions: JSON.stringify([{item: 'HVAC Service', cost: 150, priority: 'high'}, {item: 'Gutter Cleaning', cost: 200, priority: 'medium'}]), full_result: '## Maintenance Prediction\n\n### Annual Schedule\nTotal estimated cost: $3,500' },
      { floor_plan_id: 2, total_annual_cost: 5500, priority_items: 6, next_maintenance_date: '2024-02-20', predictions: JSON.stringify([{item: 'Roof Inspection', cost: 300, priority: 'high'}]), full_result: '## Maintenance Prediction\n\nLarger home requires more maintenance.' },
      { floor_plan_id: 3, total_annual_cost: 2200, priority_items: 3, next_maintenance_date: '2024-04-01', predictions: JSON.stringify([{item: 'Window Cleaning', cost: 150, priority: 'medium'}]), full_result: '## Maintenance Prediction\n\nLoft maintenance schedule.' },
      { floor_plan_id: 4, total_annual_cost: 4200, priority_items: 5, next_maintenance_date: '2024-03-01', predictions: JSON.stringify([{item: 'Salt Air Protection', cost: 500, priority: 'high'}]), full_result: '## Maintenance Prediction\n\nCoastal property needs.' },
      { floor_plan_id: 5, total_annual_cost: 7500, priority_items: 8, next_maintenance_date: '2024-02-15', predictions: JSON.stringify([{item: 'Historic Preservation', cost: 2000, priority: 'high'}]), full_result: '## Maintenance Prediction\n\nVictorian home requires specialized care.' },
      { floor_plan_id: 6, total_annual_cost: 1800, priority_items: 2, next_maintenance_date: '2024-05-01', predictions: JSON.stringify([{item: 'HVAC Filter', cost: 30, priority: 'high'}]), full_result: '## Maintenance Prediction\n\nMinimal condo maintenance.' },
      { floor_plan_id: 7, total_annual_cost: 4800, priority_items: 5, next_maintenance_date: '2024-03-10', predictions: JSON.stringify([{item: 'Pest Control', cost: 200, priority: 'medium'}]), full_result: '## Maintenance Prediction\n\nRanch home schedule.' },
      { floor_plan_id: 8, total_annual_cost: 8500, priority_items: 7, next_maintenance_date: '2024-02-28', predictions: JSON.stringify([{item: 'Elevator Service', cost: 1500, priority: 'high'}]), full_result: '## Maintenance Prediction\n\nPenthouse specialized needs.' },
      { floor_plan_id: 9, total_annual_cost: 3200, priority_items: 4, next_maintenance_date: '2024-04-15', predictions: JSON.stringify([{item: 'Weatherization', cost: 400, priority: 'high'}]), full_result: '## Maintenance Prediction\n\nCottage seasonal prep.' },
      { floor_plan_id: 10, total_annual_cost: 3800, priority_items: 4, next_maintenance_date: '2024-03-20', predictions: JSON.stringify([{item: 'HOA Exterior', cost: 0, priority: 'low'}]), full_result: '## Maintenance Prediction\n\nTownhouse shared maintenance.' },
      { floor_plan_id: 11, total_annual_cost: 4500, priority_items: 5, next_maintenance_date: '2024-03-05', predictions: JSON.stringify([{item: 'Period Fixture Care', cost: 300, priority: 'medium'}]), full_result: '## Maintenance Prediction\n\nMid-century home care.' },
      { floor_plan_id: 12, total_annual_cost: 2500, priority_items: 3, next_maintenance_date: '2024-04-10', predictions: JSON.stringify([{item: 'Garden Maintenance', cost: 400, priority: 'medium'}]), full_result: '## Maintenance Prediction\n\nGarden apartment schedule.' },
      { floor_plan_id: 13, total_annual_cost: 6200, priority_items: 6, next_maintenance_date: '2024-02-25', predictions: JSON.stringify([{item: 'Industrial Systems', cost: 800, priority: 'high'}]), full_result: '## Maintenance Prediction\n\nWarehouse conversion needs.' },
      { floor_plan_id: 14, total_annual_cost: 5800, priority_items: 6, next_maintenance_date: '2024-03-15', predictions: JSON.stringify([{item: 'Colonial Restoration', cost: 1200, priority: 'medium'}]), full_result: '## Maintenance Prediction\n\nColonial home preservation.' },
      { floor_plan_id: 15, total_annual_cost: 3000, priority_items: 4, next_maintenance_date: '2024-04-20', predictions: JSON.stringify([{item: 'Solar Panel Cleaning', cost: 200, priority: 'medium'}]), full_result: '## Maintenance Prediction\n\nEco-friendly home schedule.' },
    ];

    for (const mp of maintenancePredictions) {
      await client.query(
        'INSERT INTO maintenance_predictions (floor_plan_id, total_annual_cost, priority_items, next_maintenance_date, predictions, full_result, model_used) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [mp.floor_plan_id, mp.total_annual_cost, mp.priority_items, mp.next_maintenance_date, mp.predictions, mp.full_result, 'anthropic/claude-haiku-4.5']
      );
    }

    console.log('Seeding energy audits...');
    // Seed Energy Audits (15+ items)
    const energyAudits = [
      { floor_plan_id: 1, efficiency_score: 72.5, annual_cost_estimate: 2400, potential_savings: 720, carbon_footprint: 8.5, recommendations: JSON.stringify([{item: 'LED Upgrade', cost: 300, savings: 150}]), full_result: '## Energy Audit Report\n\n### Score: 72.5/100\n\nGood efficiency with room for improvement.' },
      { floor_plan_id: 2, efficiency_score: 68.0, annual_cost_estimate: 3800, potential_savings: 1140, carbon_footprint: 12.5, recommendations: JSON.stringify([{item: 'Smart Thermostat', cost: 250, savings: 300}]), full_result: '## Energy Audit Report\n\nLarger home has higher costs.' },
      { floor_plan_id: 3, efficiency_score: 78.5, annual_cost_estimate: 1800, potential_savings: 450, carbon_footprint: 6.0, recommendations: JSON.stringify([{item: 'Window Film', cost: 200, savings: 100}]), full_result: '## Energy Audit Report\n\nEfficient loft design.' },
      { floor_plan_id: 4, efficiency_score: 65.0, annual_cost_estimate: 3200, potential_savings: 960, carbon_footprint: 10.5, recommendations: JSON.stringify([{item: 'Solar Screens', cost: 400, savings: 200}]), full_result: '## Energy Audit Report\n\nCoastal climate challenges.' },
      { floor_plan_id: 5, efficiency_score: 55.0, annual_cost_estimate: 4500, potential_savings: 1800, carbon_footprint: 15.0, recommendations: JSON.stringify([{item: 'Insulation Upgrade', cost: 3000, savings: 800}]), full_result: '## Energy Audit Report\n\nVictorian home needs updates.' },
      { floor_plan_id: 6, efficiency_score: 82.0, annual_cost_estimate: 1400, potential_savings: 280, carbon_footprint: 4.5, recommendations: JSON.stringify([{item: 'Smart Power Strips', cost: 80, savings: 60}]), full_result: '## Energy Audit Report\n\nEfficient modern condo.' },
      { floor_plan_id: 7, efficiency_score: 70.0, annual_cost_estimate: 3000, potential_savings: 900, carbon_footprint: 10.0, recommendations: JSON.stringify([{item: 'Attic Insulation', cost: 1500, savings: 400}]), full_result: '## Energy Audit Report\n\nRanch home improvements.' },
      { floor_plan_id: 8, efficiency_score: 75.0, annual_cost_estimate: 4200, potential_savings: 1050, carbon_footprint: 14.0, recommendations: JSON.stringify([{item: 'High-Efficiency Windows', cost: 8000, savings: 600}]), full_result: '## Energy Audit Report\n\nPenthouse glass efficiency.' },
      { floor_plan_id: 9, efficiency_score: 62.0, annual_cost_estimate: 2600, potential_savings: 1040, carbon_footprint: 8.5, recommendations: JSON.stringify([{item: 'Weatherstripping', cost: 150, savings: 200}]), full_result: '## Energy Audit Report\n\nCottage draft prevention.' },
      { floor_plan_id: 10, efficiency_score: 76.0, annual_cost_estimate: 2200, potential_savings: 550, carbon_footprint: 7.5, recommendations: JSON.stringify([{item: 'Ceiling Fans', cost: 400, savings: 120}]), full_result: '## Energy Audit Report\n\nTownhouse efficiency.' },
      { floor_plan_id: 11, efficiency_score: 58.0, annual_cost_estimate: 3400, potential_savings: 1360, carbon_footprint: 11.0, recommendations: JSON.stringify([{item: 'Double-Pane Windows', cost: 5000, savings: 500}]), full_result: '## Energy Audit Report\n\nMid-century updates needed.' },
      { floor_plan_id: 12, efficiency_score: 74.0, annual_cost_estimate: 1600, potential_savings: 400, carbon_footprint: 5.5, recommendations: JSON.stringify([{item: 'Programmable Thermostat', cost: 100, savings: 150}]), full_result: '## Energy Audit Report\n\nGarden apartment efficiency.' },
      { floor_plan_id: 13, efficiency_score: 60.0, annual_cost_estimate: 5200, potential_savings: 2080, carbon_footprint: 17.0, recommendations: JSON.stringify([{item: 'HVAC Upgrade', cost: 8000, savings: 1200}]), full_result: '## Energy Audit Report\n\nWarehouse conversion needs.' },
      { floor_plan_id: 14, efficiency_score: 64.0, annual_cost_estimate: 4000, potential_savings: 1600, carbon_footprint: 13.0, recommendations: JSON.stringify([{item: 'Storm Windows', cost: 2000, savings: 400}]), full_result: '## Energy Audit Report\n\nColonial improvements.' },
      { floor_plan_id: 15, efficiency_score: 88.0, annual_cost_estimate: 1200, potential_savings: 240, carbon_footprint: 3.0, recommendations: JSON.stringify([{item: 'Battery Storage', cost: 6000, savings: 200}]), full_result: '## Energy Audit Report\n\nEco-home excellent rating.' },
    ];

    for (const ea of energyAudits) {
      await client.query(
        'INSERT INTO energy_audits (floor_plan_id, efficiency_score, annual_cost_estimate, potential_savings, carbon_footprint, recommendations, full_result, model_used) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [ea.floor_plan_id, ea.efficiency_score, ea.annual_cost_estimate, ea.potential_savings, ea.carbon_footprint, ea.recommendations, ea.full_result, 'anthropic/claude-haiku-4.5']
      );
    }

    console.log('Seeding home inspections...');
    // Seed Home Inspections (15+ items)
    const homeInspections = [
      { floor_plan_id: 1, inspection_type: 'pre-purchase', overall_condition: 'Good', critical_issues: 0, estimated_repair_cost: 3500, issues_found: JSON.stringify([{item: 'Minor caulking needed', severity: 'minor', cost: 100}]), full_result: '## Home Inspection Report\n\n**Overall: Good**\n\nMove-in ready with minor maintenance.' },
      { floor_plan_id: 2, inspection_type: 'pre-purchase', overall_condition: 'Good', critical_issues: 1, estimated_repair_cost: 8500, issues_found: JSON.stringify([{item: 'Water heater aging', severity: 'major', cost: 1500}]), full_result: '## Home Inspection Report\n\nSome updates recommended.' },
      { floor_plan_id: 3, inspection_type: 'general', overall_condition: 'Excellent', critical_issues: 0, estimated_repair_cost: 1200, issues_found: JSON.stringify([{item: 'Touch-up paint', severity: 'minor', cost: 200}]), full_result: '## Home Inspection Report\n\nExcellent condition loft.' },
      { floor_plan_id: 4, inspection_type: 'pre-purchase', overall_condition: 'Fair', critical_issues: 1, estimated_repair_cost: 15000, issues_found: JSON.stringify([{item: 'Hurricane shutters needed', severity: 'major', cost: 5000}]), full_result: '## Home Inspection Report\n\nCoastal protection needed.' },
      { floor_plan_id: 5, inspection_type: 'historic', overall_condition: 'Fair', critical_issues: 2, estimated_repair_cost: 45000, issues_found: JSON.stringify([{item: 'Foundation settling', severity: 'critical', cost: 20000}]), full_result: '## Home Inspection Report\n\nHistoric home needs restoration.' },
      { floor_plan_id: 6, inspection_type: 'general', overall_condition: 'Excellent', critical_issues: 0, estimated_repair_cost: 800, issues_found: JSON.stringify([{item: 'GFCI outlets needed', severity: 'minor', cost: 200}]), full_result: '## Home Inspection Report\n\nModern condo in great shape.' },
      { floor_plan_id: 7, inspection_type: 'pre-purchase', overall_condition: 'Good', critical_issues: 0, estimated_repair_cost: 5200, issues_found: JSON.stringify([{item: 'Roof shingles worn', severity: 'major', cost: 3000}]), full_result: '## Home Inspection Report\n\nRanch in good condition.' },
      { floor_plan_id: 8, inspection_type: 'luxury', overall_condition: 'Excellent', critical_issues: 0, estimated_repair_cost: 2500, issues_found: JSON.stringify([{item: 'Smart system update', severity: 'minor', cost: 500}]), full_result: '## Home Inspection Report\n\nPenthouse excellent condition.' },
      { floor_plan_id: 9, inspection_type: 'pre-purchase', overall_condition: 'Fair', critical_issues: 1, estimated_repair_cost: 12000, issues_found: JSON.stringify([{item: 'Plumbing update', severity: 'major', cost: 6000}]), full_result: '## Home Inspection Report\n\nCottage needs updates.' },
      { floor_plan_id: 10, inspection_type: 'general', overall_condition: 'Good', critical_issues: 0, estimated_repair_cost: 3200, issues_found: JSON.stringify([{item: 'Deck refinishing', severity: 'minor', cost: 800}]), full_result: '## Home Inspection Report\n\nTownhouse good condition.' },
      { floor_plan_id: 11, inspection_type: 'historic', overall_condition: 'Fair', critical_issues: 1, estimated_repair_cost: 18000, issues_found: JSON.stringify([{item: 'Window replacement', severity: 'major', cost: 8000}]), full_result: '## Home Inspection Report\n\nMid-century needs attention.' },
      { floor_plan_id: 12, inspection_type: 'general', overall_condition: 'Good', critical_issues: 0, estimated_repair_cost: 2200, issues_found: JSON.stringify([{item: 'Landscape drainage', severity: 'minor', cost: 600}]), full_result: '## Home Inspection Report\n\nGarden apartment good shape.' },
      { floor_plan_id: 13, inspection_type: 'commercial-to-residential', overall_condition: 'Fair', critical_issues: 2, estimated_repair_cost: 35000, issues_found: JSON.stringify([{item: 'Fire suppression update', severity: 'critical', cost: 15000}]), full_result: '## Home Inspection Report\n\nConversion needs work.' },
      { floor_plan_id: 14, inspection_type: 'pre-purchase', overall_condition: 'Good', critical_issues: 0, estimated_repair_cost: 7500, issues_found: JSON.stringify([{item: 'Chimney repair', severity: 'major', cost: 3500}]), full_result: '## Home Inspection Report\n\nColonial in good condition.' },
      { floor_plan_id: 15, inspection_type: 'green-certification', overall_condition: 'Excellent', critical_issues: 0, estimated_repair_cost: 1500, issues_found: JSON.stringify([{item: 'Solar panel cleaning', severity: 'minor', cost: 200}]), full_result: '## Home Inspection Report\n\nEco-home excellent rating.' },
    ];

    for (const hi of homeInspections) {
      await client.query(
        'INSERT INTO home_inspections (floor_plan_id, inspection_type, overall_condition, critical_issues, estimated_repair_cost, issues_found, full_result, model_used) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [hi.floor_plan_id, hi.inspection_type, hi.overall_condition, hi.critical_issues, hi.estimated_repair_cost, hi.issues_found, hi.full_result, 'anthropic/claude-haiku-4.5']
      );
    }

    console.log('Database seeded successfully!');
    console.log('Demo login: demo@example.com / password123');

  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

seedData();
