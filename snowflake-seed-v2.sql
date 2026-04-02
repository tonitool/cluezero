-- ============================================================
-- ClueZero full seed data  –  184 rows across 6 brands × 8 weeks
--
-- Covers every widget:
--   Overview / Home  → BRAND, DATE, SPEND, REACH, HEADLINE, PI
--   Competitive      → TOPIC, PI (topic distribution, PI ranking)
--   Performance      → FUNNEL (See/Think/Do/Care), HEADLINE, PI
--   ORLEN vs Market  → PI, REACH, total ad count
--   Movement         → SPEND, REACH, IMPRESSIONS, weekly trends
--
-- Run this AFTER your table already exists.
-- It truncates first so you start clean.
-- ============================================================

TRUNCATE TABLE CLUEZERO_DEV.AD_DATA.AD_INTELLIGENCE;

INSERT INTO CLUEZERO_DEV.AD_DATA.AD_INTELLIGENCE
  (BRAND, "DATE", HEADLINE, SPEND, IMPRESSIONS, REACH, PI, FUNNEL, TOPIC)
VALUES

-- ══════════════════════════════════════════════════════════════
-- ORLEN  (4 ads × 8 weeks = 32 rows)
-- PI range 62–76  |  Spend 700–1850  |  slightly below market avg
-- ══════════════════════════════════════════════════════════════
('ORLEN','2026-01-07','Save on every fill-up this January',          1450,52000,37000, 71.2,'See',  'Fuel Savings'),
('ORLEN','2026-01-07','ORLEN loyalty points: double this week',        980,41000,29000, 68.4,'Think','Loyalty'),
('ORLEN','2026-01-07','5 cents off per litre at ORLEN',              1620,58000,41000, 74.1,'Do',   'Fuel Savings'),
('ORLEN','2026-01-07','Go green with ORLEN fuel',                      730,27000,19000, 63.8,'See',  'Sustainability'),

('ORLEN','2026-01-14','ORLEN: Your road starts here',                1380,49000,35000, 70.5,'See',  'Fuel Savings'),
('ORLEN','2026-01-14','Earn more with ORLEN VITAY card',             1050,44000,31000, 67.9,'Think','Loyalty'),
('ORLEN','2026-01-14','Winter fuel deal: save 8 cents',              1780,63000,45000, 75.6,'Do',   'Fuel Savings'),
('ORLEN','2026-01-14','Electric charging now at ORLEN',                820,31000,22000, 65.2,'See',  'Mobility'),

('ORLEN','2026-01-21','ORLEN premium diesel for less',               1520,54000,38000, 72.3,'Think','Fuel Savings'),
('ORLEN','2026-01-21','Loyalty cashback: 50 PLN this month',         1100,46000,33000, 69.1,'Think','Loyalty'),
('ORLEN','2026-01-21','Fill up on Monday get a reward',              1680,60000,43000, 73.8,'Do',   'Fuel Savings'),
('ORLEN','2026-01-21','ORLEN leads in green energy',                   690,26000,18000, 62.7,'See',  'Sustainability'),

('ORLEN','2026-01-28','Nationwide savings at ORLEN stations',        1350,48000,34000, 70.9,'See',  'Fuel Savings'),
('ORLEN','2026-01-28','VITAY: 3x points this week',                  1030,43000,30000, 68.2,'Think','Loyalty'),
('ORLEN','2026-01-28','ORLEN weekend special: save 10 cents',        1850,66000,47000, 76.4,'Do',   'Fuel Savings'),
('ORLEN','2026-01-28','Join the clean fuel movement',                  760,29000,20000, 64.5,'See',  'Sustainability'),

('ORLEN','2026-02-04','ORLEN February fuel savings event',           1490,53000,38000, 71.8,'See',  'Fuel Savings'),
('ORLEN','2026-02-04','Redeem VITAY points at checkout',             1080,45000,32000, 69.4,'Do',   'Loyalty'),
('ORLEN','2026-02-04','Best fuel price guaranteed at ORLEN',         1720,61000,44000, 74.9,'Do',   'Fuel Savings'),
('ORLEN','2026-02-04','EV ready: fast charge near you',                870,33000,23000, 66.1,'See',  'Mobility'),

('ORLEN','2026-02-11','ORLEN: 6 cents off per litre today',          1560,56000,40000, 72.7,'Do',   'Fuel Savings'),
('ORLEN','2026-02-11','Exclusive deal for loyalty members',           1120,47000,33000, 70.0,'Think','Loyalty'),
('ORLEN','2026-02-11','ORLEN diesel vs competitors: you choose',     1400,50000,36000, 71.5,'Think','Fuel Savings'),
('ORLEN','2026-02-11','Sustainable mobility starts at ORLEN',          700,27000,19000, 63.2,'See',  'Sustainability'),

('ORLEN','2026-02-18','ORLEN spring savings preview',                1480,53000,37000, 71.6,'See',  'Fuel Savings'),
('ORLEN','2026-02-18','VITAY members get double points',             1060,44000,31000, 68.7,'Think','Loyalty'),
('ORLEN','2026-02-18','Best monthly fuel deal at ORLEN',             1790,64000,46000, 75.2,'Do',   'Fuel Savings'),
('ORLEN','2026-02-18','Drive electric with ORLEN network',             840,32000,22000, 65.8,'See',  'Mobility'),

('ORLEN','2026-02-25','ORLEN end-of-month mega deal',                1610,57000,41000, 73.1,'Do',   'Fuel Savings'),
('ORLEN','2026-02-25','Loyalty bonus: 100 PLN cashback',             1140,48000,34000, 70.3,'Think','Loyalty'),
('ORLEN','2026-02-25','ORLEN: Smart fuel for smart drivers',         1330,47000,34000, 70.8,'Think','Fuel Savings'),
('ORLEN','2026-02-25','Zero emissions future with ORLEN',              720,28000,20000, 64.9,'See',  'Sustainability'),

-- ══════════════════════════════════════════════════════════════
-- SHELL  (4 ads × 8 weeks = 32 rows)
-- PI range 78–92  |  Spend 1200–2800  |  market leader
-- ══════════════════════════════════════════════════════════════
('SHELL','2026-01-07','Shell V-Power: performance unleashed',        2400,86000,62000, 88.4,'See',  'Innovation'),
('SHELL','2026-01-07','Shell Clubsmart: earn on every litre',        1800,65000,47000, 82.1,'Think','Loyalty'),
('SHELL','2026-01-07','Shell cashback: get 10 cents back',           2650,95000,68000, 91.2,'Do',   'Fuel Savings'),
('SHELL','2026-01-07','Shell powers a cleaner tomorrow',             1200,43000,31000, 78.3,'See',  'Sustainability'),

('SHELL','2026-01-14','Shell: fuel the adventure',                   2300,82000,59000, 87.6,'See',  'Mobility'),
('SHELL','2026-01-14','Clubsmart double points weekend',             1850,66000,47000, 83.4,'Think','Loyalty'),
('SHELL','2026-01-14','Shell Go+ exclusive fuel savings',            2700,97000,70000, 90.5,'Do',   'Fuel Savings'),
('SHELL','2026-01-14','Innovating for a better road ahead',          1250,45000,32000, 79.2,'See',  'Innovation'),

('SHELL','2026-01-21','Shell V-Power Nitro+: discover it',           2500,90000,65000, 89.3,'Think','Innovation'),
('SHELL','2026-01-21','Shell rewards: turn litres into points',      1900,68000,49000, 84.2,'Think','Loyalty'),
('SHELL','2026-01-21','Limited Shell save-more offer',               2800,101000,72000, 92.1,'Do',  'Fuel Savings'),
('SHELL','2026-01-21','Shell hydrogen: the road forward',            1300,47000,34000, 80.5,'See',  'Sustainability'),

('SHELL','2026-01-28','Shell: where performance meets value',        2350,84000,61000, 88.0,'See',  'Fuel Savings'),
('SHELL','2026-01-28','Shell Go+ member exclusive savings',          1920,69000,50000, 84.8,'Think','Loyalty'),
('SHELL','2026-01-28','Shell weekend fill-up discount',              2750,99000,71000, 91.6,'Do',   'Fuel Savings'),
('SHELL','2026-01-28','Shell accelerates EV infrastructure',         1350,49000,35000, 80.9,'See',  'Mobility'),

('SHELL','2026-02-04','Shell V-Power now 12 cents off',              2450,88000,63000, 89.7,'Do',   'Fuel Savings'),
('SHELL','2026-02-04','Earn Shell points on every journey',          1870,67000,48000, 83.8,'Think','Loyalty'),
('SHELL','2026-02-04','Shell innovation: fuels the future',          2600,93000,67000, 90.2,'See',  'Innovation'),
('SHELL','2026-02-04','Shell low carbon driving solutions',          1280,46000,33000, 79.7,'See',  'Sustainability'),

('SHELL','2026-02-11','Shell premium diesel, premium savings',       2380,85000,61000, 88.2,'Think','Fuel Savings'),
('SHELL','2026-02-11','Clubsmart: unlock exclusive deals',           1930,69000,50000, 84.5,'Think','Loyalty'),
('SHELL','2026-02-11','Shell Go+ biggest savings of Feb',            2780,100000,72000, 91.8,'Do',  'Fuel Savings'),
('SHELL','2026-02-11','Driving to net zero with Shell',              1310,47000,34000, 80.1,'See',  'Sustainability'),

('SHELL','2026-02-18','Shell spring power campaign',                 2420,87000,62000, 89.1,'See',  'Innovation'),
('SHELL','2026-02-18','Shell points triple this weekend',            1960,70000,51000, 85.3,'Do',   'Loyalty'),
('SHELL','2026-02-18','Shell: biggest February fuel sale',           2720,98000,70000, 91.4,'Do',   'Fuel Savings'),
('SHELL','2026-02-18','Shell EV fast charge now live',               1360,49000,35000, 81.2,'See',  'Mobility'),

('SHELL','2026-02-25','Shell March preview deal',                    2460,88000,63000, 89.5,'See',  'Fuel Savings'),
('SHELL','2026-02-25','Shell Clubsmart month-end bonus',             1980,71000,51000, 85.7,'Think','Loyalty'),
('SHELL','2026-02-25','Shell: record savings before March',          2800,101000,73000, 92.4,'Do',  'Fuel Savings'),
('SHELL','2026-02-25','Shell clean energy commitment',               1330,48000,34000, 80.7,'See',  'Sustainability'),

-- ══════════════════════════════════════════════════════════════
-- ARAL  (4 ads × 8 weeks = 32 rows)
-- PI range 70–87  |  Spend 980–2320  |  strong #2
-- ══════════════════════════════════════════════════════════════
('ARAL','2026-01-07','Aral: Drive further for less',                 1850,66000,48000, 81.3,'See',  'Fuel Savings'),
('ARAL','2026-01-07','Aral Payback: earn on every fill',             1400,50000,36000, 76.2,'Think','Loyalty'),
('ARAL','2026-01-07','Aral winter fuel deal: save now',              2100,75000,54000, 84.7,'Do',   'Fuel Savings'),
('ARAL','2026-01-07','Aral Ultimate: next generation fuel',          1050,38000,27000, 72.4,'Think','Innovation'),

('ARAL','2026-01-14','Aral: fuel smarter drive better',              1780,64000,46000, 80.8,'See',  'Fuel Savings'),
('ARAL','2026-01-14','Payback double points at Aral',                1450,52000,37000, 76.9,'Think','Loyalty'),
('ARAL','2026-01-14','Aral 9 cents off per litre',                   2150,77000,55000, 85.3,'Do',   'Fuel Savings'),
('ARAL','2026-01-14','Aral cares for the environment',                980,35000,25000, 70.8,'See',  'Sustainability'),

('ARAL','2026-01-21','Aral Ultimate: experience the power',          1920,69000,50000, 82.1,'Think','Innovation'),
('ARAL','2026-01-21','Aral Payback: 500 extra points',               1520,54000,39000, 77.5,'Think','Loyalty'),
('ARAL','2026-01-21','Biggest Aral fuel savings event',              2250,81000,58000, 86.0,'Do',   'Fuel Savings'),
('ARAL','2026-01-21','Aral: reducing CO2 on every road',             1020,37000,26000, 71.6,'See',  'Sustainability'),

('ARAL','2026-01-28','Aral: January savings continue',               1830,66000,47000, 81.0,'See',  'Fuel Savings'),
('ARAL','2026-01-28','Payback card: more rewards this week',         1480,53000,38000, 77.1,'Think','Loyalty'),
('ARAL','2026-01-28','Aral fuel deal you cannot miss',               2180,78000,56000, 85.7,'Do',   'Fuel Savings'),
('ARAL','2026-01-28','Aral electric: charge your journey',           1100,40000,28000, 73.2,'See',  'Mobility'),

('ARAL','2026-02-04','Aral February: biggest savings',               1860,67000,48000, 81.5,'See',  'Fuel Savings'),
('ARAL','2026-02-04','Aral Payback: February bonus',                 1510,54000,39000, 77.8,'Think','Loyalty'),
('ARAL','2026-02-04','Aral 11 cents off this weekend',               2270,82000,59000, 86.4,'Do',   'Fuel Savings'),
('ARAL','2026-02-04','Aral Ultimate fuel innovation',                1080,39000,28000, 73.8,'Think','Innovation'),

('ARAL','2026-02-11','Aral premium: worth every cent',               1810,65000,47000, 80.6,'Think','Fuel Savings'),
('ARAL','2026-02-11','Payback triple bonus at Aral',                 1540,55000,40000, 78.2,'Do',   'Loyalty'),
('ARAL','2026-02-11','Aral mid-February deal',                       2200,79000,57000, 85.9,'Do',   'Fuel Savings'),
('ARAL','2026-02-11','Cleaner roads with Aral',                      1010,36000,26000, 72.0,'See',  'Sustainability'),

('ARAL','2026-02-18','Aral spring is coming deals',                  1870,67000,48000, 81.7,'See',  'Fuel Savings'),
('ARAL','2026-02-18','Aral Payback: final week bonus',               1560,56000,40000, 78.5,'Think','Loyalty'),
('ARAL','2026-02-18','Aral: last chance February savings',           2290,82000,59000, 86.8,'Do',   'Fuel Savings'),
('ARAL','2026-02-18','Aral e-charging network grows',                1130,41000,29000, 74.4,'See',  'Mobility'),

('ARAL','2026-02-25','Aral: March teaser deals',                     1900,68000,49000, 82.3,'See',  'Fuel Savings'),
('ARAL','2026-02-25','Payback end-of-month boost',                   1580,57000,41000, 78.9,'Think','Loyalty'),
('ARAL','2026-02-25','Aral biggest monthly fuel offer',              2320,84000,60000, 87.2,'Do',   'Fuel Savings'),
('ARAL','2026-02-25','Aral sustainable fuel promise',                1050,38000,27000, 72.6,'See',  'Sustainability'),

-- ══════════════════════════════════════════════════════════════
-- Circle K  (4 ads × 8 weeks = 32 rows)
-- PI range 68–83  |  Spend 850–2030
-- ══════════════════════════════════════════════════════════════
('Circle K','2026-01-07','Circle K: your everyday fuel deal',        1600,57000,41000, 75.8,'See',  'Fuel Savings'),
('Circle K','2026-01-07','Circle K Extra: earn while you fuel',      1200,43000,31000, 71.3,'Think','Loyalty'),
('Circle K','2026-01-07','7 cents off at Circle K this week',        1820,65000,47000, 79.4,'Do',   'Fuel Savings'),
('Circle K','2026-01-07','Coffee and fuel for less at CK',            850,31000,22000, 68.1,'See',  'Mobility'),

('Circle K','2026-01-14','Circle K: everyday value on roads',        1550,56000,40000, 75.2,'See',  'Fuel Savings'),
('Circle K','2026-01-14','CK Extra points: January double-up',       1240,45000,32000, 72.0,'Think','Loyalty'),
('Circle K','2026-01-14','Circle K: beat the winter prices',         1870,67000,48000, 80.1,'Do',   'Fuel Savings'),
('Circle K','2026-01-14','Sustainability at every Circle K',          870,32000,23000, 68.7,'See',  'Sustainability'),

('Circle K','2026-01-21','Circle K fuel: smarter every week',        1620,58000,42000, 76.3,'Think','Fuel Savings'),
('Circle K','2026-01-21','Circle K Extra: triple your rewards',      1270,46000,33000, 72.7,'Think','Loyalty'),
('Circle K','2026-01-21','Circle K: 8 cents off this Thursday',      1900,68000,49000, 80.7,'Do',   'Fuel Savings'),
('Circle K','2026-01-21','Go further with Circle K biofuel',          900,33000,24000, 69.4,'See',  'Sustainability'),

('Circle K','2026-01-28','Circle K late January savings',            1580,57000,41000, 75.6,'See',  'Fuel Savings'),
('Circle K','2026-01-28','CK Extra: member exclusive savings',       1290,47000,34000, 73.1,'Think','Loyalty'),
('Circle K','2026-01-28','Circle K weekend fill-up promo',           1930,69000,50000, 81.2,'Do',   'Fuel Savings'),
('Circle K','2026-01-28','EV charging at Circle K near you',          920,34000,24000, 70.0,'See',  'Mobility'),

('Circle K','2026-02-04','Circle K February fuel promotion',         1640,59000,42000, 76.8,'See',  'Fuel Savings'),
('Circle K','2026-02-04','Circle K Extra: bonus February deal',      1320,48000,34000, 73.5,'Think','Loyalty'),
('Circle K','2026-02-04','Circle K: 9 cents off on Saturdays',       1950,70000,50000, 81.6,'Do',   'Fuel Savings'),
('Circle K','2026-02-04','Circle K cares: green fuel options',        940,34000,25000, 70.6,'See',  'Sustainability'),

('Circle K','2026-02-11','Circle K: mid-month fuel deal',            1600,57000,41000, 75.9,'Think','Fuel Savings'),
('Circle K','2026-02-11','CK Extra double stamp weekend',            1340,49000,35000, 73.8,'Do',   'Loyalty'),
('Circle K','2026-02-11','Circle K: biggest savings in Feb',         1970,71000,51000, 82.0,'Do',   'Fuel Savings'),
('Circle K','2026-02-11','Circle K innovation in clean fuel',         960,35000,25000, 71.2,'See',  'Innovation'),

('Circle K','2026-02-18','Circle K spring fuel preview',             1660,60000,43000, 77.2,'See',  'Fuel Savings'),
('Circle K','2026-02-18','CK Extra: final February points',          1360,49000,35000, 74.1,'Think','Loyalty'),
('Circle K','2026-02-18','Circle K: end-of-month savings',           2000,72000,52000, 82.4,'Do',   'Fuel Savings'),
('Circle K','2026-02-18','Drive green this spring with CK',           980,36000,26000, 71.8,'See',  'Sustainability'),

('Circle K','2026-02-25','Circle K March preview offer',             1690,61000,44000, 77.6,'See',  'Fuel Savings'),
('Circle K','2026-02-25','CK Extra: month-end loyalty bonus',        1390,50000,36000, 74.5,'Think','Loyalty'),
('Circle K','2026-02-25','Circle K: biggest offer this month',       2030,73000,52000, 82.9,'Do',   'Fuel Savings'),
('Circle K','2026-02-25','Circle K biofuel revolution',              1010,37000,26000, 72.3,'See',  'Sustainability'),

-- ══════════════════════════════════════════════════════════════
-- ENI  (4 ads × 8 weeks = 32 rows)
-- PI range 74–87  |  Spend 820–1690  |  quality positioning
-- ══════════════════════════════════════════════════════════════
('ENI','2026-01-07','Eni: Italian quality fuel for less',            1300,47000,34000, 79.5,'See',  'Fuel Savings'),
('ENI','2026-01-07','Eni card: earn on every litre',                  950,34000,25000, 74.8,'Think','Loyalty'),
('ENI','2026-01-07','Eni: save 8 cents per litre now',               1480,53000,38000, 83.2,'Do',   'Fuel Savings'),
('ENI','2026-01-07','Eni sustainable fuel solutions',                  820,30000,21000, 77.1,'See',  'Sustainability'),

('ENI','2026-01-14','Eni Diesel+: maximum performance',              1350,49000,35000, 80.2,'Think','Innovation'),
('ENI','2026-01-14','Eni card double points this week',               980,35000,25000, 75.5,'Think','Loyalty'),
('ENI','2026-01-14','Eni: best fuel deal this January',              1520,55000,39000, 84.0,'Do',   'Fuel Savings'),
('ENI','2026-01-14','Eni blue: the eco fuel choice',                  850,31000,22000, 77.8,'See',  'Sustainability'),

('ENI','2026-01-21','Eni: precision fuel engineering',               1400,50000,36000, 80.9,'Think','Innovation'),
('ENI','2026-01-21','Eni loyalty: 200 extra points',                 1010,37000,26000, 76.2,'Think','Loyalty'),
('ENI','2026-01-21','Eni January: your best fuel price',             1560,56000,40000, 84.7,'Do',   'Fuel Savings'),
('ENI','2026-01-21','Eni zero emissions roadmap',                      870,32000,23000, 78.5,'See',  'Sustainability'),

('ENI','2026-01-28','Eni: January deals do not end',                 1370,49000,35000, 80.5,'See',  'Fuel Savings'),
('ENI','2026-01-28','Eni card: triple reward week',                  1030,37000,27000, 76.8,'Think','Loyalty'),
('ENI','2026-01-28','Eni: 9 cents off per litre today',              1590,57000,41000, 85.3,'Do',   'Fuel Savings'),
('ENI','2026-01-28','Eni EV: charge smarter',                         890,32000,23000, 79.2,'See',  'Mobility'),

('ENI','2026-02-04','Eni February performance fuel',                 1420,51000,37000, 81.2,'See',  'Innovation'),
('ENI','2026-02-04','Eni card February bonus points',                1050,38000,27000, 77.1,'Think','Loyalty'),
('ENI','2026-02-04','Eni: unbeatable fuel savings Feb',              1620,58000,42000, 85.9,'Do',   'Fuel Savings'),
('ENI','2026-02-04','Eni sustainable: drive cleaner',                 900,33000,23000, 79.8,'See',  'Sustainability'),

('ENI','2026-02-11','Eni premium: feel the difference',              1390,50000,36000, 80.8,'Think','Innovation'),
('ENI','2026-02-11','Eni loyalty: redeem this weekend',              1070,39000,28000, 77.4,'Do',   'Loyalty'),
('ENI','2026-02-11','Eni mid-Feb fuel discount',                     1640,59000,42000, 86.2,'Do',   'Fuel Savings'),
('ENI','2026-02-11','Eni green transition pledge',                    910,33000,24000, 80.1,'See',  'Sustainability'),

('ENI','2026-02-18','Eni: premium fuel this spring',                 1450,52000,37000, 81.6,'See',  'Fuel Savings'),
('ENI','2026-02-18','Eni card: final bonus February',                1090,39000,28000, 77.8,'Think','Loyalty'),
('ENI','2026-02-18','Eni: last big savings of Feb',                  1660,60000,43000, 86.6,'Do',   'Fuel Savings'),
('ENI','2026-02-18','Eni: mobility of tomorrow',                      930,34000,24000, 80.7,'See',  'Mobility'),

('ENI','2026-02-25','Eni March deals starting now',                  1470,53000,38000, 81.9,'See',  'Fuel Savings'),
('ENI','2026-02-25','Eni card: end of month loyalty bonus',          1110,40000,29000, 78.1,'Think','Loyalty'),
('ENI','2026-02-25','Eni: start March with savings',                 1690,61000,44000, 87.1,'Do',   'Fuel Savings'),
('ENI','2026-02-25','Eni clean energy: the smart choice',             950,34000,24000, 81.3,'See',  'Sustainability'),

-- ══════════════════════════════════════════════════════════════
-- ESSO  (3 ads × 8 weeks = 24 rows)
-- PI range 65–77  |  Spend 820–1400  |  smaller player
-- ══════════════════════════════════════════════════════════════
('ESSO','2026-01-07','Esso Synergy fuel at your service',            1100,40000,28000, 70.4,'See',  'Innovation'),
('ESSO','2026-01-07','Esso Extras: collect on every litre',           820,30000,21000, 65.8,'Think','Loyalty'),
('ESSO','2026-01-07','Esso: 6 cents off this week',                  1250,45000,32000, 73.9,'Do',   'Fuel Savings'),

('ESSO','2026-01-14','Esso Synergy: power your drive',               1130,41000,29000, 71.0,'Think','Innovation'),
('ESSO','2026-01-14','Esso Extras double points January',             850,31000,22000, 66.4,'Think','Loyalty'),
('ESSO','2026-01-14','Esso January savings deal',                    1280,46000,33000, 74.5,'Do',   'Fuel Savings'),

('ESSO','2026-01-21','Esso: energy for every road',                  1080,39000,28000, 70.8,'See',  'Fuel Savings'),
('ESSO','2026-01-21','Esso Extras: 300 bonus points',                 870,32000,23000, 67.1,'Think','Loyalty'),
('ESSO','2026-01-21','Esso: 7 cents off at the pump',                1300,47000,34000, 75.2,'Do',   'Fuel Savings'),

('ESSO','2026-01-28','Esso Synergy: clean power on roads',           1120,40000,29000, 71.4,'See',  'Innovation'),
('ESSO','2026-01-28','Esso Extras triple reward weekend',             890,32000,23000, 67.7,'Do',   'Loyalty'),
('ESSO','2026-01-28','Esso late January savings',                    1320,48000,34000, 75.8,'Do',   'Fuel Savings'),

('ESSO','2026-02-04','Esso: February fuel promotion',                1150,41000,30000, 71.8,'See',  'Fuel Savings'),
('ESSO','2026-02-04','Esso Extras February bonus',                    910,33000,24000, 68.2,'Think','Loyalty'),
('ESSO','2026-02-04','Esso: 8 cents off this weekend',               1340,48000,35000, 76.3,'Do',   'Fuel Savings'),

('ESSO','2026-02-11','Esso Synergy: drive with confidence',          1160,42000,30000, 72.2,'Think','Innovation'),
('ESSO','2026-02-11','Esso Extras: mid-month reward',                 930,34000,24000, 68.8,'Think','Loyalty'),
('ESSO','2026-02-11','Esso: mid-February fuel offer',                1360,49000,35000, 76.7,'Do',   'Fuel Savings'),

('ESSO','2026-02-18','Esso spring energy campaign',                  1180,43000,31000, 72.6,'See',  'Fuel Savings'),
('ESSO','2026-02-18','Esso Extras: accumulate and win',               950,34000,25000, 69.3,'Think','Loyalty'),
('ESSO','2026-02-18','Esso: pre-March fuel savings',                 1380,50000,36000, 77.1,'Do',   'Fuel Savings'),

('ESSO','2026-02-25','Esso: March ready savings',                    1200,43000,31000, 73.1,'See',  'Fuel Savings'),
('ESSO','2026-02-25','Esso Extras: month-end boost',                  970,35000,25000, 69.9,'Think','Loyalty'),
('ESSO','2026-02-25','Esso: biggest savings this month',             1400,50000,36000, 77.6,'Do',   'Fuel Savings');

-- ============================================================
-- Total: 184 rows
-- After running, go to Connections → Sync Now
-- All widgets should populate after sync completes.
--
-- Note on "New vs Existing" charts:
-- Every ad will appear as 100% New because each Snowflake row
-- creates one ad with one spend estimate for its week.
-- All other charts (spend, PI, funnel, topics, reach) will be full.
-- ============================================================
