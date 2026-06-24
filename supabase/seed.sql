-- ============================================================================
-- Demo seed data — optional. Run after 0001_init.sql for a populated menu.
-- ============================================================================

insert into menu_items (category_id, name, description, price_cents, popular, available, sort_order)
select c.id, data.name, data.description, data.price_cents, data.popular, true, data.sort_order
from categories c
join (values
  -- Burgers
  ('burgers', 'Classic Cheeseburger',  'Juicy beef patty, melted cheddar, lettuce, tomato, house sauce.', 950, true, 1),
  ('burgers', 'Double Smash Burger',   'Two thin smashed patties, American cheese, pickles, onion.',     1150, true, 2),
  ('burgers', 'Crispy Chicken Burger', 'Buttermilk-fried chicken, slaw, spicy mayo brioche bun.',         1050, false, 3),
  ('burgers', 'Veggie Burger',         'House black-bean patty, avocado, sprouts, chipotle aioli.',       990, false, 4),
  -- Pizza
  ('pizza', 'Margherita',              'San Marzano tomato, fresh mozzarella, basil, olive oil.',         1200, true, 1),
  ('pizza', 'Pepperoni',               'Double pepperoni, mozzarella, tomato base.',                      1350, true, 2),
  ('pizza', 'BBQ Chicken',             'Grilled chicken, red onion, cilantro, BBQ swirl.',                1450, false, 3),
  ('pizza', 'Four Cheese',             'Mozzarella, gorgonzola, parmesan, ricotta.',                      1500, false, 4),
  -- BBQ
  ('bbq', 'Half Rack Ribs',            'Slow-smoked pork ribs, house BBQ, slaw.',                         2200, true, 1),
  ('bbq', 'Brisket Plate',             '14-hour smoked brisket, pickles, bread.',                         2100, true, 2),
  ('bbq', 'Pulled Pork Bowl',          'Smoked pulled pork, cornbread, baked beans.',                     1650, false, 3),
  -- Drinks
  ('drinks', 'Coca-Cola Can',          'Chilled 330ml can.',                                              250, true, 1),
  ('drinks', 'Bottled Water',          '500ml still mineral water.',                                      180, true, 2),
  ('drinks', 'Fresh Lemonade',         'Hand-pressed lemon, mint, cane sugar.',                           450, false, 3),
  ('drinks', 'Iced Coffee',            'Cold brew over ice, your choice of milk.',                        550, false, 4),
  -- Desserts
  ('desserts', 'Chocolate Lava Cake',  'Warm molten centre, vanilla bean ice cream.',                     750, true, 1),
  ('desserts', 'Tiramisu',             'Espresso-soaked ladyfingers, mascarpone, cocoa.',                 690, false, 2),
  ('desserts', 'Cheesecake',           'New York baked cheesecake, berry compote.',                       720, false, 3)
) as data(slug, name, description, price_cents, popular, sort_order)
  on c.slug = data.slug
on conflict do nothing;

-- Inventory for stocked items (drinks/cans) so the decrement logic is demoable
insert into inventory (menu_item_id, name, quantity, low_stock_threshold)
select mi.id, 'Coca-Cola Can', 48, 6 from menu_items mi where mi.name = 'Coca-Cola Can'
on conflict (menu_item_id) do nothing;
insert into inventory (menu_item_id, name, quantity, low_stock_threshold)
select mi.id, 'Bottled Water', 24, 6 from menu_items mi where mi.name = 'Bottled Water'
on conflict (menu_item_id) do nothing;
