-- ============================================================
--  ClueZero — Snowflake seed data
--  Run in: CLUEZERO_DEV.AD_DATA
--  Covers: 6 brands × 8 weeks × all funnel stages × topics
-- ============================================================

TRUNCATE TABLE CLUEZERO_DEV.AD_DATA.AD_PERFORMANCE;

INSERT INTO CLUEZERO_DEV.AD_DATA.AD_PERFORMANCE
  (BRAND, "DATE", HEADLINE, SPEND, IMPRESSIONS, REACH, PI, FUNNEL, TOPIC)
VALUES

-- ── WEEK 1: 2026-02-02 ──────────────────────────────────────

-- ORLEN
('ORLEN','2026-02-02','Fuel Up and Earn ORLEN Points Today',3800,210000,98000,74.2,'See','Shop'),
('ORLEN','2026-02-02','Compare Fuel Prices — ORLEN Wins',2900,155000,72000,68.5,'Think','Existing'),
('ORLEN','2026-02-02','Download the ORLEN App and Save Now',2100,118000,55000,71.8,'Do','Shop'),
('ORLEN','2026-02-02','Your ORLEN Loyalty Card — More Perks',1800,96000,44000,66.3,'Care','Existing'),
('ORLEN','2026-02-02','ORLEN EV Charging — Fast and Reliable',1400,75000,35000,62.1,'Think','Laden'),
('ORLEN','2026-02-02','Join the ORLEN Fleet Programme',2300,128000,60000,69.4,'Do','Fleet'),

-- Aral
('Aral','2026-02-02','Aral SuperCard — Points on Every Fill',5200,290000,138000,58.7,'See','Existing'),
('Aral','2026-02-02','Drive More, Pay Less at Aral',4100,225000,107000,54.2,'Think','Shop'),
('Aral','2026-02-02','Book Your Car Wash Online at Aral',2800,155000,74000,49.8,'Do','Waschen'),
('Aral','2026-02-02','Aral Business Fleet — Reduce Costs',3600,198000,94000,61.3,'Do','Fleet'),
('Aral','2026-02-02','Aral Ultimate Fuel — Feel the Difference',2200,122000,58000,52.9,'Think','Shop'),
('Aral','2026-02-02','Stay Loyal with Aral Rewards',1900,104000,50000,47.5,'Care','Existing'),

-- Circle K
('Circle K','2026-02-02','Circle K Coffee — Your Morning Ritual',1200,68000,32000,38.4,'See','Shop'),
('Circle K','2026-02-02','Easy Fueling — No App Needed',900,50000,24000,31.7,'Think','Shop'),
('Circle K','2026-02-02','Circle K Car Wash Deal This Week',700,39000,19000,29.3,'Do','Waschen'),
('Circle K','2026-02-02','Fresh Food on the Go at Circle K',800,44000,21000,34.6,'See','Shop'),
('Circle K','2026-02-02','Circle K Miles — Earn on Every Visit',600,33000,16000,28.1,'Care','Existing'),
('Circle K','2026-02-02','Charge Your EV at Circle K Stations',500,28000,13000,26.8,'Think','Laden'),

-- ENI
('ENI','2026-02-02','ENI Card — Smart Savings Every Day',3100,171000,81000,61.4,'See','Fleet'),
('ENI','2026-02-02','ENI Premium Fuel — Better Mileage',2500,138000,66000,58.9,'Think','Shop'),
('ENI','2026-02-02','Switch to ENI — See the Difference',2000,110000,52000,55.3,'Do','Existing'),
('ENI','2026-02-02','ENI Business Solutions for Fleets',2800,154000,73000,63.7,'Do','Fleet'),
('ENI','2026-02-02','ENI Loyalty Club — Exclusive Benefits',1600,88000,42000,52.6,'Care','Existing'),
('ENI','2026-02-02','ENI EV Network — Charging Made Easy',1300,72000,34000,49.8,'Think','Laden'),

-- Esso
('Esso','2026-02-02','Esso Synergy Fuel — Maximum Performance',4500,248000,118000,67.3,'See','Shop'),
('Esso','2026-02-02','Esso Extra — Every Litre Counts',3700,204000,97000,63.8,'Think','Existing'),
('Esso','2026-02-02','Save More with the Esso App',2900,160000,76000,65.2,'Do','Shop'),
('Esso','2026-02-02','Esso Fleet Card — Business Benefits',3200,176000,84000,68.9,'Do','Fleet'),
('Esso','2026-02-02','Esso Smiles Loyalty — Earn Every Day',2100,116000,55000,60.4,'Care','Existing'),
('Esso','2026-02-02','Wash and Go at Esso Stations',1800,99000,47000,57.1,'Do','Waschen'),

-- Shell
('Shell','2026-02-02','Shell V-Power — Engineered to Perform',2800,154000,73000,64.5,'See','Shop'),
('Shell','2026-02-02','ClubSmart — Rewards That Go Further',2200,121000,58000,59.8,'Think','Existing'),
('Shell','2026-02-02','Shell Go+ App — Unlock Daily Deals',1900,105000,50000,62.3,'Do','Shop'),
('Shell','2026-02-02','Shell Fleet Solutions — Cut Your Costs',2500,138000,66000,66.1,'Do','Fleet'),
('Shell','2026-02-02','Shell Car Wash — Spotless Every Time',1400,77000,37000,55.7,'Do','Waschen'),
('Shell','2026-02-02','Shell EV Charging Network Expands',1600,88000,42000,58.4,'Think','Laden'),

-- ── WEEK 2: 2026-02-09 ──────────────────────────────────────

('ORLEN','2026-02-09','Weekend Deal — Double ORLEN Points',4100,226000,107000,76.8,'See','Shop'),
('ORLEN','2026-02-09','Why Drivers Choose ORLEN Premium',3200,176000,84000,70.3,'Think','Existing'),
('ORLEN','2026-02-09','Book Your ORLEN Car Wash Online',2400,132000,63000,73.5,'Do','Waschen'),
('ORLEN','2026-02-09','ORLEN Fleet — Better Rates for Business',2700,149000,71000,71.9,'Do','Fleet'),
('ORLEN','2026-02-09','ORLEN App — Track Every Fill-Up',1900,105000,50000,67.4,'Think','Shop'),
('ORLEN','2026-02-09','Loyalty Members Get More at ORLEN',2100,116000,55000,68.7,'Care','Existing'),

('Aral','2026-02-09','Aral Family Weekend — Deals for All',5600,308000,147000,57.3,'See','Shop'),
('Aral','2026-02-09','Aral Card — Smarter Fuel Spending',4300,237000,113000,53.8,'Think','Fleet'),
('Aral','2026-02-09','Premium Car Wash at Aral This Week',3100,171000,81000,50.2,'Do','Waschen'),
('Aral','2026-02-09','Top Up Points with Aral App',2500,138000,66000,55.6,'Do','Existing'),
('Aral','2026-02-09','Aral EV — Fast Charging Nationwide',1800,99000,47000,48.9,'Think','Laden'),
('Aral','2026-02-09','Aral Loyalty — Perks Every Week',2000,110000,52000,46.3,'Care','Existing'),

('Circle K','2026-02-09','Fresh Coffee Free on Mondays at Circle K',1300,72000,34000,40.1,'See','Shop'),
('Circle K','2026-02-09','Circle K — Fuel Without the Fuss',1000,55000,26000,33.4,'Think','Shop'),
('Circle K','2026-02-09','Weekend Car Wash Special at Circle K',750,41000,20000,30.7,'Do','Waschen'),
('Circle K','2026-02-09','Circle K Snacks & Drinks — Road Trip Ready',820,45000,21000,35.9,'See','Shop'),
('Circle K','2026-02-09','Earn Miles Faster at Circle K',580,32000,15000,27.3,'Care','Existing'),
('Circle K','2026-02-09','Circle K Charge — EV Stations Near You',520,29000,14000,25.6,'Think','Laden'),

('ENI','2026-02-09','ENI February Fuel Offer — Save Up to 8%',3400,187000,89000,63.2,'See','Shop'),
('ENI','2026-02-09','ENI vs the Market — Who Really Wins?',2700,149000,71000,60.5,'Think','Existing'),
('ENI','2026-02-09','ENI App — Easy Payments at the Pump',2200,121000,58000,57.8,'Do','Shop'),
('ENI','2026-02-09','ENI Fleet Card — Manage Every Journey',3000,165000,79000,65.1,'Do','Fleet'),
('ENI','2026-02-09','ENI Rewards — The More You Drive',1700,94000,45000,54.3,'Care','Existing'),
('ENI','2026-02-09','ENI Charging Points — Coming to Your City',1400,77000,37000,51.6,'Think','Laden'),

('Esso','2026-02-09','Esso February Savings — Fuel Smarter',4800,264000,126000,65.9,'See','Shop'),
('Esso','2026-02-09','Esso Premium vs Standard — Know the Facts',3900,215000,102000,62.4,'Think','Existing'),
('Esso','2026-02-09','Esso Synergy — Every Drop Performs',3100,171000,81000,64.7,'Do','Shop'),
('Esso','2026-02-09','Esso Business Fleet — Apply Now',3400,187000,89000,67.3,'Do','Fleet'),
('Esso','2026-02-09','Esso Smiles — Redeem Points This Month',2300,127000,60000,61.8,'Care','Existing'),
('Esso','2026-02-09','Gleam Clean Car Wash at Esso',1900,105000,50000,58.2,'Do','Waschen'),

('Shell','2026-02-09','Shell V-Power Nitro+ — The Next Level',3000,165000,79000,66.8,'See','Shop'),
('Shell','2026-02-09','Shell vs Competitors — See the Data',2300,127000,60000,61.5,'Think','Existing'),
('Shell','2026-02-09','Shell Go+ — More Ways to Earn Today',2000,110000,52000,63.9,'Do','Shop'),
('Shell','2026-02-09','Shell Fleet Card — Simple, Powerful, Smart',2600,143000,68000,67.4,'Do','Fleet'),
('Shell','2026-02-09','Shell Express Car Wash — In and Out Fast',1500,83000,39000,57.2,'Do','Waschen'),
('Shell','2026-02-09','Shell Recharge — EV Solutions for Everyone',1700,94000,45000,59.8,'Think','Laden'),

-- ── WEEK 3: 2026-02-16 ──────────────────────────────────────

('ORLEN','2026-02-16','ORLEN Spring Campaign — Fuel for Less',3600,198000,94000,75.1,'See','Shop'),
('ORLEN','2026-02-16','ORLEN Premium vs Regular — Which Wins?',2800,154000,73000,69.8,'Think','Existing'),
('ORLEN','2026-02-16','ORLEN Car Wash — Get a Free Clean Today',2300,127000,60000,72.6,'Do','Waschen'),
('ORLEN','2026-02-16','ORLEN Fleet Card — Apply in 5 Minutes',2600,143000,68000,70.3,'Do','Fleet'),
('ORLEN','2026-02-16','Join ORLEN Loyalty — 50,000 Members Strong',2000,110000,52000,68.9,'Care','Existing'),
('ORLEN','2026-02-16','ORLEN EV Hub — Charge While You Shop',1500,83000,39000,64.2,'Think','Laden'),

('Aral','2026-02-16','Aral Spring Sale — Limited Time Offer',5100,281000,134000,56.4,'See','Shop'),
('Aral','2026-02-16','Smart Drivers Choose Aral Card',4000,220000,105000,52.7,'Think','Fleet'),
('Aral','2026-02-16','Sparkling Clean with Aral Car Wash',2900,160000,76000,49.1,'Do','Waschen'),
('Aral','2026-02-16','Aral SuperCard — Earn Double This Week',2600,143000,68000,54.3,'Do','Existing'),
('Aral','2026-02-16','Aral Charge — Fast EV Charging Now Live',1700,94000,45000,47.6,'Think','Laden'),
('Aral','2026-02-16','Aral Loyalty — Exclusive Member Prices',1900,105000,50000,45.8,'Care','Existing'),

('Circle K','2026-02-16','Circle K — Freshly Brewed, Fast Served',1100,61000,29000,37.8,'See','Shop'),
('Circle K','2026-02-16','Simple Fueling at Circle K — Always Open',880,48000,23000,31.2,'Think','Shop'),
('Circle K','2026-02-16','Mid-Week Car Wash Deal at Circle K',680,37000,18000,28.5,'Do','Waschen'),
('Circle K','2026-02-16','Circle K Hot Food — Perfect Pit Stop',760,42000,20000,33.7,'See','Shop'),
('Circle K','2026-02-16','Circle K Miles — Double Points Tuesday',540,30000,14000,26.4,'Care','Existing'),
('Circle K','2026-02-16','Charge Up at Circle K EV Points',490,27000,13000,24.9,'Think','Laden'),

('ENI','2026-02-16','ENI Flash Deal — 10% Off Premium Fuel',3200,176000,84000,62.8,'See','Shop'),
('ENI','2026-02-16','ENI Diesel — Proven Performance Data',2600,143000,68000,59.7,'Think','Existing'),
('ENI','2026-02-16','Pay with ENI App — Get 5% Back',2100,116000,55000,57.1,'Do','Shop'),
('ENI','2026-02-16','ENI Business Fleet Package — Save More',2900,160000,76000,64.8,'Do','Fleet'),
('ENI','2026-02-16','ENI Club — Exclusive February Offers',1600,88000,42000,53.9,'Care','Existing'),
('ENI','2026-02-16','ENI EV Charging — 100+ Locations Now',1300,72000,34000,50.7,'Think','Laden'),

('Esso','2026-02-16','Esso Synergy Diesel — Proven Efficiency',4400,242000,115000,66.2,'See','Shop'),
('Esso','2026-02-16','Esso vs Aral — See Who Comes Out Ahead',3600,198000,94000,63.1,'Think','Existing'),
('Esso','2026-02-16','Esso App — Pay and Save Every Time',2800,154000,73000,64.9,'Do','Shop'),
('Esso','2026-02-16','Esso Fleet — The Professional Choice',3300,182000,87000,68.4,'Do','Fleet'),
('Esso','2026-02-16','Esso Smiles Rewards — This Month Only',2200,121000,58000,62.1,'Care','Existing'),
('Esso','2026-02-16','Esso Car Wash — Crystal Clean Guaranteed',1800,99000,47000,58.7,'Do','Waschen'),

('Shell','2026-02-16','Shell FuelSave Diesel — Go Further',2700,149000,71000,65.3,'See','Shop'),
('Shell','2026-02-16','Shell vs Esso — Independent Fuel Review',2100,116000,55000,60.9,'Think','Existing'),
('Shell','2026-02-16','Shell App Offer — Fill Up, Earn Points',1800,99000,47000,62.7,'Do','Shop'),
('Shell','2026-02-16','Shell Fleet Business Plan — No Setup Fee',2400,132000,63000,66.5,'Do','Fleet'),
('Shell','2026-02-16','Shell CarWash — Shiny in 5 Minutes',1300,72000,34000,56.4,'Do','Waschen'),
('Shell','2026-02-16','Shell Recharge — EV Charging Points Live',1600,88000,42000,59.1,'Think','Laden'),

-- ── WEEK 4: 2026-02-23 ──────────────────────────────────────

('ORLEN','2026-02-23','ORLEN End of Month Deal — Fill Up Now',4200,231000,110000,77.4,'See','Shop'),
('ORLEN','2026-02-23','ORLEN Loyalty vs Competitors — You Decide',3100,171000,81000,71.6,'Think','Existing'),
('ORLEN','2026-02-23','Book ORLEN Car Wash — Free Tyre Check',2600,143000,68000,74.1,'Do','Waschen'),
('ORLEN','2026-02-23','ORLEN Fleet — February Business Offer',2900,160000,76000,72.8,'Do','Fleet'),
('ORLEN','2026-02-23','ORLEN Points — Redeem Before Month End',2200,121000,58000,70.5,'Care','Existing'),
('ORLEN','2026-02-23','ORLEN EV — 150 Charging Points Now Open',1800,99000,47000,66.3,'Think','Laden'),

('Aral','2026-02-23','Aral End of Month — SuperCard Bonus',5800,319000,152000,59.1,'See','Existing'),
('Aral','2026-02-23','Aral Premium Diesel — Worth Every Cent',4500,248000,118000,55.4,'Think','Shop'),
('Aral','2026-02-23','Aral Car Wash Express — Book in App',3200,176000,84000,51.7,'Do','Waschen'),
('Aral','2026-02-23','Aral Fleet — February Business Package',3800,209000,100000,62.8,'Do','Fleet'),
('Aral','2026-02-23','Earn More Points at Aral This Weekend',2700,149000,71000,56.9,'Care','Existing'),
('Aral','2026-02-23','Aral Charge — EV Points at 200 Stations',2000,110000,52000,49.3,'Think','Laden'),

('Circle K','2026-02-23','Circle K Monthly Wrap — Best Deals Inside',1400,77000,37000,41.3,'See','Shop'),
('Circle K','2026-02-23','Circle K — Quick Stop, Happy Wallet',1100,61000,29000,34.7,'Think','Shop'),
('Circle K','2026-02-23','End of Month Car Wash Deal at Circle K',820,45000,21000,31.9,'Do','Waschen'),
('Circle K','2026-02-23','Circle K Ready Meals — Drive-Through Easy',900,50000,24000,36.2,'See','Shop'),
('Circle K','2026-02-23','Last Chance — Double Miles at Circle K',640,35000,17000,28.8,'Care','Existing'),
('Circle K','2026-02-23','Circle K EV Hub — Charge and Shop',560,31000,15000,27.1,'Think','Laden'),

('ENI','2026-02-23','ENI End of Month Savings Event',3600,198000,94000,64.7,'See','Shop'),
('ENI','2026-02-23','ENI Fuel Data — Why We Outperform',2900,160000,76000,61.8,'Think','Existing'),
('ENI','2026-02-23','ENI Digital Payment — Instant Cashback',2300,127000,60000,58.9,'Do','Shop'),
('ENI','2026-02-23','ENI Corporate Fleet — Free Trial Month',3200,176000,84000,66.4,'Do','Fleet'),
('ENI','2026-02-23','ENI Club Members — February Bonus Points',1800,99000,47000,55.7,'Care','Existing'),
('ENI','2026-02-23','ENI EV Fast Chargers — All Major Routes',1500,83000,39000,52.9,'Think','Laden'),

('Esso','2026-02-23','Esso February Grand Finale — Fuel Deals',5100,281000,134000,67.8,'See','Shop'),
('Esso','2026-02-23','Esso Superior Fuel — Benchmark Results',4100,226000,107000,64.5,'Think','Existing'),
('Esso','2026-02-23','Esso App — Exclusive Last Day Offer',3200,176000,84000,66.3,'Do','Shop'),
('Esso','2026-02-23','Esso Corporate Fleet — No Fee February',3600,198000,94000,70.1,'Do','Fleet'),
('Esso','2026-02-23','Esso Smiles — Points Worth More in March',2500,138000,66000,63.7,'Care','Existing'),
('Esso','2026-02-23','Gleam Car Wash — Free with 40L Fill',2000,110000,52000,60.2,'Do','Waschen'),

('Shell','2026-02-23','Shell FuelSave End of Month Boost',3100,171000,81000,67.2,'See','Shop'),
('Shell','2026-02-23','Shell Quality Guarantee — Read the Facts',2400,132000,63000,62.8,'Think','Existing'),
('Shell','2026-02-23','Shell Go+ — Final February Bonus Offer',2100,116000,55000,64.7,'Do','Shop'),
('Shell','2026-02-23','Shell Business Fleet — Free Month Offer',2700,149000,71000,68.3,'Do','Fleet'),
('Shell','2026-02-23','Shell CarWash — Last Week Promo Price',1600,88000,42000,58.1,'Do','Waschen'),
('Shell','2026-02-23','Shell Recharge Network — Now at 300 Sites',1900,105000,50000,61.4,'Think','Laden'),

-- ── WEEK 5: 2026-03-02 ──────────────────────────────────────

('ORLEN','2026-03-02','ORLEN March — New Month, New Deals',4400,242000,115000,78.3,'See','Shop'),
('ORLEN','2026-03-02','ORLEN vs Market — March Fuel Comparison',3400,187000,89000,72.9,'Think','Existing'),
('ORLEN','2026-03-02','ORLEN Car Wash Spring Pack — Book Now',2700,149000,71000,75.4,'Do','Waschen'),
('ORLEN','2026-03-02','ORLEN Fleet March Offer — Limited Slots',3100,171000,81000,73.6,'Do','Fleet'),
('ORLEN','2026-03-02','ORLEN Loyalty Tier Up — March Bonus',2300,127000,60000,71.8,'Care','Existing'),
('ORLEN','2026-03-02','ORLEN EV Charge Free on First Visit',2000,110000,52000,68.5,'Think','Laden'),
('ORLEN','2026-03-02','Hire Now — ORLEN Station Staff Wanted',1200,66000,31000,58.3,'See','Stellenanzeigen'),

('Aral','2026-03-02','Aral March Kickoff — Big Fuel Savings',6100,336000,160000,60.4,'See','Shop'),
('Aral','2026-03-02','Aral Card — Fuel Smarter This March',4700,259000,123000,56.7,'Think','Fleet'),
('Aral','2026-03-02','Spring Car Wash at Aral — Just €8.99',3400,187000,89000,52.8,'Do','Waschen'),
('Aral','2026-03-02','Aral SuperCard Bonus — 3× Points Week',3000,165000,79000,57.4,'Do','Existing'),
('Aral','2026-03-02','Aral Charge — New Stations This Month',2100,116000,55000,50.1,'Think','Laden'),
('Aral','2026-03-02','Aral Loyalty — Your March Rewards Inside',2200,121000,58000,47.9,'Care','Existing'),
('Aral','2026-03-02','Join Our Team — Aral Station Careers',1400,77000,37000,44.2,'See','Stellenanzeigen'),

('Circle K','2026-03-02','Circle K Spring — Great Coffee, Better Fuel',1500,83000,39000,42.6,'See','Shop'),
('Circle K','2026-03-02','Circle K — Fuel and Food Made Easy',1200,66000,31000,35.9,'Think','Shop'),
('Circle K','2026-03-02','Spring Car Wash at Circle K — €6.99',900,50000,24000,33.1,'Do','Waschen'),
('Circle K','2026-03-02','Circle K Meal Deal — Lunch on the Road',1000,55000,26000,38.4,'See','Shop'),
('Circle K','2026-03-02','Circle K Miles — Earn 2× This Week',700,39000,19000,30.6,'Care','Existing'),
('Circle K','2026-03-02','EV Charge at Circle K — Only €0.29/kWh',600,33000,16000,28.9,'Think','Laden'),
('Circle K','2026-03-02','Circle K Is Hiring — Apply Today',450,25000,12000,22.1,'See','Stellenanzeigen'),

('ENI','2026-03-02','ENI March Launch — Save from Day One',3800,209000,100000,65.3,'See','Shop'),
('ENI','2026-03-02','ENI Premium Diesel — March Performance',3000,165000,79000,62.6,'Think','Existing'),
('ENI','2026-03-02','ENI Pay & Go — Contactless at the Pump',2400,132000,63000,59.8,'Do','Shop'),
('ENI','2026-03-02','ENI Fleet Card — March Corporate Deal',3300,182000,87000,67.2,'Do','Fleet'),
('ENI','2026-03-02','ENI Club — Earn More in March',1900,105000,50000,56.4,'Care','Existing'),
('ENI','2026-03-02','ENI EV Fast Lane — Charge in 20 Minutes',1600,88000,42000,53.7,'Think','Laden'),
('ENI','2026-03-02','Careers at ENI — Fuel Your Future',1100,61000,29000,46.8,'See','Stellenanzeigen'),

('Esso','2026-03-02','Esso March Launch — Synergy Fuel Deals',5300,292000,139000,68.4,'See','Shop'),
('Esso','2026-03-02','Esso Synergy Diesel — March Data Results',4200,231000,110000,65.1,'Think','Existing'),
('Esso','2026-03-02','Esso App March — Exclusive Launch Offer',3300,182000,87000,67.6,'Do','Shop'),
('Esso','2026-03-02','Esso Fleet — First Month Management Free',3700,204000,97000,71.3,'Do','Fleet'),
('Esso','2026-03-02','Esso Smiles — Earn Double in March',2600,143000,68000,64.9,'Care','Existing'),
('Esso','2026-03-02','Gleam Car Wash March Deal — Only €7.50',2100,116000,55000,61.5,'Do','Waschen'),
('Esso','2026-03-02','Esso Careers — Join Our March Intake',1400,77000,37000,54.2,'See','Stellenanzeigen'),

('Shell','2026-03-02','Shell March Drive — FuelSave Spring',3300,182000,87000,68.1,'See','Shop'),
('Shell','2026-03-02','Shell V-Power — March Benchmark Report',2600,143000,68000,63.7,'Think','Existing'),
('Shell','2026-03-02','Shell Go+ March — Triple Points Weekend',2200,121000,58000,65.8,'Do','Shop'),
('Shell','2026-03-02','Shell Fleet March — Business Case Study',2800,154000,73000,69.4,'Do','Fleet'),
('Shell','2026-03-02','Shell CarWash Spring — Freshness Guaranteed',1700,94000,45000,59.2,'Do','Waschen'),
('Shell','2026-03-02','Shell Recharge Spring — 350 Sites Now Open',2000,110000,52000,62.7,'Think','Laden'),
('Shell','2026-03-02','Shell Is Hiring — Station Roles Available',1200,66000,31000,51.3,'See','Stellenanzeigen'),

-- ── WEEK 6: 2026-03-09 ──────────────────────────────────────

('ORLEN','2026-03-09','ORLEN Mid-March Momentum — Earn More',4700,259000,123000,79.1,'See','Shop'),
('ORLEN','2026-03-09','ORLEN Fuel Guide — March Market Update',3600,198000,94000,73.8,'Think','Existing'),
('ORLEN','2026-03-09','ORLEN Wash & Go — Spring Special Price',2900,160000,76000,76.2,'Do','Waschen'),
('ORLEN','2026-03-09','ORLEN Fleet — Mid-March Business Deal',3300,182000,87000,74.5,'Do','Fleet'),
('ORLEN','2026-03-09','ORLEN Loyalty Gold — Exclusive Upgrade',2500,138000,66000,72.9,'Care','Existing'),
('ORLEN','2026-03-09','ORLEN EV — New Motorway Chargers Open',2200,121000,58000,70.1,'Think','Laden'),
('ORLEN','2026-03-09','Join ORLEN Team — Great Benefits Package',1400,77000,37000,61.2,'See','Stellenanzeigen'),

('Aral','2026-03-09','Aral Mid-March — SuperCard Points Rush',6400,352000,168000,61.8,'See','Existing'),
('Aral','2026-03-09','Aral Business Fuel — March Benchmarks',5000,275000,131000,58.1,'Think','Fleet'),
('Aral','2026-03-09','Aral Car Wash Mid-Week — Only €7.99',3600,198000,94000,54.3,'Do','Waschen'),
('Aral','2026-03-09','Aral Bonus Week — 4× SuperCard Points',3200,176000,84000,59.7,'Do','Existing'),
('Aral','2026-03-09','Aral Pulse EV — Mid-March New Locations',2300,127000,60000,51.4,'Think','Laden'),
('Aral','2026-03-09','Aral Club Members — Mid-March Surprise',2400,132000,63000,49.6,'Care','Existing'),
('Aral','2026-03-09','Aral Careers — Now Recruiting March Intake',1600,88000,42000,45.8,'See','Stellenanzeigen'),

('Circle K','2026-03-09','Circle K — Great Coffee, Open 24/7',1600,88000,42000,43.9,'See','Shop'),
('Circle K','2026-03-09','Circle K — Mid-March Fuel Offer',1300,72000,34000,37.2,'Think','Shop'),
('Circle K','2026-03-09','Circle K Splash — Car Wash from €5.99',950,52000,25000,34.5,'Do','Waschen'),
('Circle K','2026-03-09','Circle K Roadside Lunch — Grab & Go',1050,58000,28000,39.7,'See','Shop'),
('Circle K','2026-03-09','Circle K Miles Multiplier — Mid-March',760,42000,20000,32.1,'Care','Existing'),
('Circle K','2026-03-09','Circle K EV — Charge at 500 Locations',660,36000,17000,30.3,'Think','Laden'),
('Circle K','2026-03-09','Work at Circle K — Apply This Week',490,27000,13000,23.4,'See','Stellenanzeigen'),

('ENI','2026-03-09','ENI Mid-Month Deal — Fill Up for Less',4000,220000,105000,66.9,'See','Shop'),
('ENI','2026-03-09','ENI Fuel Report — Mid-March Findings',3200,176000,84000,63.8,'Think','Existing'),
('ENI','2026-03-09','ENI Digital Wallet — Pay and Save',2600,143000,68000,60.9,'Do','Shop'),
('ENI','2026-03-09','ENI Fleet Mid-Month — Corporate Offer',3500,193000,92000,68.3,'Do','Fleet'),
('ENI','2026-03-09','ENI Loyalty — Bonus Points This Weekend',2000,110000,52000,57.6,'Care','Existing'),
('ENI','2026-03-09','ENI EV Rapid — 50kW Chargers Now Live',1700,94000,45000,54.8,'Think','Laden'),
('ENI','2026-03-09','ENI Now Hiring — Station Manager Roles',1200,66000,31000,48.3,'See','Stellenanzeigen'),

('Esso','2026-03-09','Esso Mid-March Synergy — Fuel and Save',5600,308000,147000,69.7,'See','Shop'),
('Esso','2026-03-09','Esso Mid-March Fuel Data — You Decide',4400,242000,115000,66.3,'Think','Existing'),
('Esso','2026-03-09','Esso App Mid-Month — Bonus Cash Back',3500,193000,92000,68.8,'Do','Shop'),
('Esso','2026-03-09','Esso Fleet Mid-March — Apply for Account',3900,215000,102000,72.6,'Do','Fleet'),
('Esso','2026-03-09','Esso Smiles Mid-March — Earn 3× Points',2800,154000,73000,65.4,'Care','Existing'),
('Esso','2026-03-09','Gleam Wash Mid-Week — Free Air & Water',2300,127000,60000,62.9,'Do','Waschen'),
('Esso','2026-03-09','Join Esso — Mid-March Hiring Drive',1500,83000,39000,56.1,'See','Stellenanzeigen'),

('Shell','2026-03-09','Shell Mid-March FuelSave Campaign',3500,193000,92000,69.4,'See','Shop'),
('Shell','2026-03-09','Shell Premium Fuel Report — March Data',2700,149000,71000,64.9,'Think','Existing'),
('Shell','2026-03-09','Shell Go+ Mid-Month — Double Stamps',2300,127000,60000,67.1,'Do','Shop'),
('Shell','2026-03-09','Shell Fleet Mid-March — New Client Offer',3000,165000,79000,70.7,'Do','Fleet'),
('Shell','2026-03-09','Shell CarWash Mid-Week — 50% Off',1800,99000,47000,60.5,'Do','Waschen'),
('Shell','2026-03-09','Shell EV Recharge — Mid-March New Sites',2100,116000,55000,64.2,'Think','Laden'),
('Shell','2026-03-09','Shell Careers — Mid-March Open Roles',1300,72000,34000,53.8,'See','Stellenanzeigen'),

-- ── WEEK 7: 2026-03-16 ──────────────────────────────────────

('ORLEN','2026-03-16','ORLEN Spring Peak — Best Prices of March',4900,270000,128000,80.2,'See','Shop'),
('ORLEN','2026-03-16','ORLEN Loyalty vs Aral — Who Really Wins?',3800,209000,100000,75.1,'Think','Existing'),
('ORLEN','2026-03-16','ORLEN Spring Wash Pack — Save €15',3100,171000,81000,77.8,'Do','Waschen'),
('ORLEN','2026-03-16','ORLEN Fleet Spring — Exclusive Rates',3500,193000,92000,76.3,'Do','Fleet'),
('ORLEN','2026-03-16','ORLEN Loyalty — Spring Tier Upgrade',2700,149000,71000,74.6,'Care','Existing'),
('ORLEN','2026-03-16','ORLEN EV Spring — All New Charging Hub',2400,132000,63000,71.9,'Think','Laden'),
('ORLEN','2026-03-16','ORLEN Hiring Now — Full-Time Roles Open',1600,88000,42000,63.4,'See','Stellenanzeigen'),

('Aral','2026-03-16','Aral Spring Push — SuperCard Mega Points',6700,369000,176000,63.2,'See','Existing'),
('Aral','2026-03-16','Aral Spring Diesel — Performance Stats',5200,286000,136000,59.5,'Think','Shop'),
('Aral','2026-03-16','Aral Spring Car Wash — From €6.99',3800,209000,100000,55.7,'Do','Waschen'),
('Aral','2026-03-16','Aral Fleet Spring — Priority Account Setup',4100,226000,107000,64.2,'Do','Fleet'),
('Aral','2026-03-16','Aral Spring Loyalty — Extra Member Perks',2900,160000,76000,58.3,'Care','Existing'),
('Aral','2026-03-16','Aral Charge Spring — 250 New EV Points',2500,138000,66000,52.6,'Think','Laden'),
('Aral','2026-03-16','Aral Spring Careers — Roles Across Poland',1800,99000,47000,47.3,'See','Stellenanzeigen'),

('Circle K','2026-03-16','Circle K Spring Awakening — Coffee Deals',1700,94000,45000,45.2,'See','Shop'),
('Circle K','2026-03-16','Circle K Spring Fuel — Great Value Inside',1400,77000,37000,38.5,'Think','Shop'),
('Circle K','2026-03-16','Spring Car Wash at Circle K — Now €5.49',1000,55000,26000,35.8,'Do','Waschen'),
('Circle K','2026-03-16','Circle K Spring Bites — Fresh & Fast',1100,61000,29000,41.1,'See','Shop'),
('Circle K','2026-03-16','Circle K Miles Spring — Earn Extra Now',810,45000,21000,33.4,'Care','Existing'),
('Circle K','2026-03-16','Circle K EV Spring — Extended Hours',700,39000,19000,31.6,'Think','Laden'),
('Circle K','2026-03-16','Circle K Spring Jobs — Apply Now',530,29000,14000,25.7,'See','Stellenanzeigen'),

('ENI','2026-03-16','ENI Spring Launch — Great March Rates',4200,231000,110000,68.4,'See','Shop'),
('ENI','2026-03-16','ENI Spring Fuel Data — March Benchmarks',3400,187000,89000,65.3,'Think','Existing'),
('ENI','2026-03-16','ENI App Spring — Pay, Save, Earn',2800,154000,73000,62.6,'Do','Shop'),
('ENI','2026-03-16','ENI Fleet Spring — Priority Signup Open',3700,204000,97000,70.1,'Do','Fleet'),
('ENI','2026-03-16','ENI Spring Club — Bigger Rewards Now',2200,121000,58000,59.3,'Care','Existing'),
('ENI','2026-03-16','ENI EV Spring Hub — Opened 20 New Sites',1900,105000,50000,56.7,'Think','Laden'),
('ENI','2026-03-16','ENI Spring Recruitment — New Positions',1300,72000,34000,50.4,'See','Stellenanzeigen'),

('Esso','2026-03-16','Esso Spring Synergy — Premium for Less',5800,319000,152000,71.2,'See','Shop'),
('Esso','2026-03-16','Esso Spring Benchmark — All Fuels Tested',4600,253000,120000,67.9,'Think','Existing'),
('Esso','2026-03-16','Esso App Spring — Exclusive Earn Offer',3700,204000,97000,70.4,'Do','Shop'),
('Esso','2026-03-16','Esso Fleet Spring — Priority Account Offer',4100,226000,107000,74.8,'Do','Fleet'),
('Esso','2026-03-16','Esso Smiles Spring — Biggest Earn Yet',3000,165000,79000,67.6,'Care','Existing'),
('Esso','2026-03-16','Gleam Spring Wash — Free With 50L Fill',2500,138000,66000,64.1,'Do','Waschen'),
('Esso','2026-03-16','Esso Spring Careers — Join Our Team',1700,94000,45000,58.3,'See','Stellenanzeigen'),

('Shell','2026-03-16','Shell Spring FuelSave — Drive Greener',3700,204000,97000,71.3,'See','Shop'),
('Shell','2026-03-16','Shell Spring Fuel Review — Expert Verdict',2900,160000,76000,66.8,'Think','Existing'),
('Shell','2026-03-16','Shell Go+ Spring — Triple Points Week',2500,138000,66000,69.2,'Do','Shop'),
('Shell','2026-03-16','Shell Fleet Spring — Premium Business Plan',3200,176000,84000,72.6,'Do','Fleet'),
('Shell','2026-03-16','Shell CarWash Spring — Best Prices Yet',1900,105000,50000,62.4,'Do','Waschen'),
('Shell','2026-03-16','Shell EV Spring — 400 Active Charge Points',2300,127000,60000,66.9,'Think','Laden'),
('Shell','2026-03-16','Shell Spring Hiring — Join Our Team Now',1400,77000,37000,56.1,'See','Stellenanzeigen'),

-- ── WEEK 8: 2026-03-23 ──────────────────────────────────────

('ORLEN','2026-03-23','ORLEN March Finale — Don\'t Miss Out',5200,286000,136000,81.5,'See','Shop'),
('ORLEN','2026-03-23','ORLEN — The Clear Fuel Leader This March',4100,226000,107000,76.4,'Think','Existing'),
('ORLEN','2026-03-23','ORLEN Wash Season Finale — Book Now',3400,187000,89000,79.1,'Do','Waschen'),
('ORLEN','2026-03-23','ORLEN Fleet March Finale — Last Slots',3800,209000,100000,77.7,'Do','Fleet'),
('ORLEN','2026-03-23','ORLEN Loyalty March End — Tier Review',3000,165000,79000,76.3,'Care','Existing'),
('ORLEN','2026-03-23','ORLEN EV March — Motorway Coverage Done',2700,149000,71000,73.8,'Think','Laden'),
('ORLEN','2026-03-23','Last Chance — ORLEN March Job Fair',1800,99000,47000,65.9,'See','Stellenanzeigen'),

('Aral','2026-03-23','Aral March Finale — SuperCard Last Call',7000,385000,184000,64.6,'See','Existing'),
('Aral','2026-03-23','Aral Diesel March Finale — Full Report',5500,303000,144000,60.9,'Think','Shop'),
('Aral','2026-03-23','Aral Wash March End — Best Price Ever',4100,226000,107000,57.2,'Do','Waschen'),
('Aral','2026-03-23','Aral Fleet March Finale — Priority Signup',4500,248000,118000,65.7,'Do','Fleet'),
('Aral','2026-03-23','Aral Loyalty March Finale — Bonus Drop',3200,176000,84000,59.8,'Care','Existing'),
('Aral','2026-03-23','Aral Charge — March Finale New Stations',2800,154000,73000,53.9,'Think','Laden'),
('Aral','2026-03-23','Aral March Finale Careers — Final Intake',2000,110000,52000,49.1,'See','Stellenanzeigen'),

('Circle K','2026-03-23','Circle K March Close — Final Week Deals',1900,105000,50000,46.7,'See','Shop'),
('Circle K','2026-03-23','Circle K — March End Fuel Offer',1600,88000,42000,40.1,'Think','Shop'),
('Circle K','2026-03-23','Circle K March Finale Wash — Now €4.99',1100,61000,29000,37.4,'Do','Waschen'),
('Circle K','2026-03-23','Circle K March Bites — End of Month Deal',1200,66000,31000,43.6,'See','Shop'),
('Circle K','2026-03-23','Circle K Miles March End — Last Chance',890,49000,23000,35.7,'Care','Existing'),
('Circle K','2026-03-23','Circle K EV — March End New Locations',780,43000,20000,33.9,'Think','Laden'),
('Circle K','2026-03-23','Circle K March Finale Jobs — Apply Now',570,31000,15000,27.2,'See','Stellenanzeigen'),

('ENI','2026-03-23','ENI March Finale — Biggest Savings Yet',4500,248000,118000,70.1,'See','Shop'),
('ENI','2026-03-23','ENI March End Fuel — Final Data Report',3700,204000,97000,67.2,'Think','Existing'),
('ENI','2026-03-23','ENI App March Finale — Last Cashback',3000,165000,79000,64.5,'Do','Shop'),
('ENI','2026-03-23','ENI Fleet March End — Final Offer Open',4000,220000,105000,71.8,'Do','Fleet'),
('ENI','2026-03-23','ENI Club March Finale — Biggest Bonus',2500,138000,66000,61.7,'Care','Existing'),
('ENI','2026-03-23','ENI EV March End — Full Route Coverage',2100,116000,55000,59.1,'Think','Laden'),
('ENI','2026-03-23','ENI March Finale Recruitment — Join Now',1400,77000,37000,52.7,'See','Stellenanzeigen'),

('Esso','2026-03-23','Esso March Grand Finale — Synergy Deals',6200,341000,162000,72.9,'See','Shop'),
('Esso','2026-03-23','Esso March End — Industry-Leading Results',4900,270000,128000,69.6,'Think','Existing'),
('Esso','2026-03-23','Esso App March Finale — Biggest Offer',3900,215000,102000,72.1,'Do','Shop'),
('Esso','2026-03-23','Esso Fleet March End — Last Account Slots',4400,242000,115000,76.4,'Do','Fleet'),
('Esso','2026-03-23','Esso Smiles March Finale — 5× Points',3300,182000,87000,69.3,'Care','Existing'),
('Esso','2026-03-23','Gleam March Grand Finale Wash — Free',2700,149000,71000,66.8,'Do','Waschen'),
('Esso','2026-03-23','Esso March Finale — Last Hiring Round',1900,105000,50000,60.2,'See','Stellenanzeigen'),

('Shell','2026-03-23','Shell March Grand FuelSave Finale',4000,220000,105000,73.7,'See','Shop'),
('Shell','2026-03-23','Shell March End Fuel — Final Review',3100,171000,81000,69.2,'Think','Existing'),
('Shell','2026-03-23','Shell Go+ March Finale — Ultimate Earn',2700,149000,71000,71.6,'Do','Shop'),
('Shell','2026-03-23','Shell Fleet March End — Final Signup',3500,193000,92000,74.9,'Do','Fleet'),
('Shell','2026-03-23','Shell CarWash March Finale — €3.99 Only',2100,116000,55000,64.7,'Do','Waschen'),
('Shell','2026-03-23','Shell EV March End — Network Complete',2500,138000,66000,69.3,'Think','Laden'),
('Shell','2026-03-23','Shell March Finale Hiring — Apply Today',1600,88000,42000,58.6,'See','Stellenanzeigen');
