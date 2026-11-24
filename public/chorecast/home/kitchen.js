/* Chorecast homes (a prototype): food and cooking.
   What's in the fridge and the pantry (bought with XP from the Groceries app on the phone), the recipes a character
   can make from it, and the little models of each ingredient and meal (held in the hand, set on the bench, on a
   plate). The home (app.js) turns a recipe into the real steps of making it: open the fridge, look in, take each
   ingredient out and put it on the bench one at a time, fetch the step stool and climb up (the bench is above the
   character's eyes), prepare each part, cook it on the stove (on the stool again), plate up, sit down to eat, and
   put the plate where that kid would (see habits in app.js).
   Kids can pick the recipe they want made next (the Recipes app); otherwise the character picks one it has
   everything for, suited to the time of day. */
(function () {
  const T = window.THREE, IH = window.IsoHome = window.IsoHome || {};
  if (!T || !IH.kit) return;
  const { Kit } = IH.kit;

  // where: fridge (cold) or pantry; xp: the price in the Groceries app; the shape is how it's drawn
  const FOOD = {
    egg: { name: 'Eggs', emoji: '🥚', where: 'fridge', xp: 20, shape: k => k.ball(0.09, 0, 0.09, 0, '#fff6e6', { s: [0.85, 1.1, 0.85], n: 10 }) },
    milk: { name: 'Milk', emoji: '🥛', where: 'fridge', xp: 20, shape: k => { k.box(0.16, 0.3, 0.16, 0, 0, 0, '#ffffff', { r: 0.03 }); k.box(0.17, 0.08, 0.17, 0, 0.18, 0, '#6fa8e8', { r: 0.02 }); } },
    cheese: { name: 'Cheese', emoji: '🧀', where: 'fridge', xp: 25, shape: k => k.box(0.22, 0.12, 0.16, 0, 0, 0, '#ffd35a', { r: 0.02 }) },
    butter: { name: 'Butter', emoji: '🧈', where: 'fridge', xp: 15, shape: k => k.box(0.18, 0.08, 0.1, 0, 0, 0, '#fff0a8', { r: 0.02 }) },
    tomato: { name: 'Tomatoes', emoji: '🍅', where: 'fridge', xp: 15, shape: k => { k.ball(0.1, 0, 0.1, 0, '#ef4b3f', { n: 10 }); k.cone(0.03, 0.05, 0, 0.19, 0, '#4cae4c', { n: 5 }); } },
    lettuce: { name: 'Lettuce', emoji: '🥬', where: 'fridge', xp: 15, shape: k => k.ball(0.13, 0, 0.12, 0, '#7cd36a', { s: [1, 0.85, 1], n: 10 }) },
    carrot: { name: 'Carrots', emoji: '🥕', where: 'fridge', xp: 10, shape: k => { k.cone(0.05, 0.3, 0, 0, 0, '#ff8a3d', { n: 6, rx: Math.PI / 2 }); k.cone(0.03, 0.08, 0, 0, -0.17, '#4cae4c', { n: 4, rx: -Math.PI / 2 }); } },
    chicken: { name: 'Chicken', emoji: '🍗', where: 'fridge', xp: 40, shape: k => { k.ball(0.11, 0, 0.1, 0, '#e9a868', { s: [1.2, 0.8, 1], n: 10 }); k.cyl(0.025, 0.14, 0.12, 0.08, 0, '#fff6e6', { n: 5, rz: -1.2 }); } },
    fish: { name: 'Fish', emoji: '🐟', where: 'fridge', xp: 40, shape: k => { k.ball(0.1, 0, 0.07, 0, '#9fc3e0', { s: [1.6, 0.6, 0.8], n: 10 }); k.cone(0.07, 0.1, -0.2, 0.07, 0, '#9fc3e0', { n: 4, rz: Math.PI / 2 }); } },
    apple: { name: 'Apples', emoji: '🍎', where: 'fridge', xp: 10, shape: k => { k.ball(0.1, 0, 0.1, 0, '#e8463e', { n: 10 }); k.cyl(0.012, 0.06, 0, 0.19, 0, '#6b4330', { n: 4 }); } },
    banana: { name: 'Bananas', emoji: '🍌', where: 'pantry', xp: 10, shape: k => k.torus(0.14, 0.04, 0, 0.06, 0, '#ffd84a', { arc: 1.8, rx: Math.PI / 2 }) },
    bread: { name: 'Bread', emoji: '🍞', where: 'pantry', xp: 20, shape: k => k.box(0.32, 0.18, 0.18, 0, 0, 0, '#d99a52', { r: 0.07 }) },
    rice: { name: 'Rice', emoji: '🍚', where: 'pantry', xp: 20, shape: k => k.box(0.16, 0.24, 0.1, 0, 0, 0, '#f4f1e8', { r: 0.03 }) },
    pasta: { name: 'Pasta', emoji: '🍝', where: 'pantry', xp: 20, shape: k => k.box(0.16, 0.24, 0.08, 0, 0, 0, '#ffcf5a', { r: 0.03 }) },
    oats: { name: 'Oats', emoji: '🥣', where: 'pantry', xp: 15, shape: k => k.cyl(0.08, 0.22, 0, 0, 0, '#c99a64', { n: 10 }) },
    honey: { name: 'Honey', emoji: '🍯', where: 'pantry', xp: 20, shape: k => { k.cyl(0.07, 0.14, 0, 0, 0, '#ffb43a', { n: 10 }); k.cyl(0.075, 0.04, 0, 0.14, 0, '#c98f5a', { n: 10 }); } }
  };
  // at: stove (cooked in a pan) or bench (put together on the bench); prep: seconds per ingredient; cook: seconds on
  // the stove; when: the parts of the day it suits; colour: how the meal looks on the plate
  const RECIPES = [
    { id: 'porridge', name: 'Honey porridge', emoji: '🥣', needs: ['oats', 'milk', 'honey'], at: 'stove', prep: 6, cook: 70, when: ['morning'], col: '#e8d2a6' },
    { id: 'eggs', name: 'Scrambled eggs on toast', emoji: '🍳', needs: ['egg', 'butter', 'bread'], at: 'stove', prep: 8, cook: 60, when: ['morning', 'midday'], col: '#ffe27a' },
    { id: 'sandwich', name: 'Cheese and tomato sandwich', emoji: '🥪', needs: ['bread', 'cheese', 'tomato'], at: 'bench', prep: 12, cook: 0, when: ['midday', 'afternoon'], col: '#f2c46b' },
    { id: 'salad', name: 'Crunchy salad', emoji: '🥗', needs: ['lettuce', 'tomato', 'carrot'], at: 'bench', prep: 14, cook: 0, when: ['midday', 'evening'], col: '#8fd36a' },
    { id: 'fruit', name: 'Fruit bowl', emoji: '🍎', needs: ['apple', 'banana'], at: 'bench', prep: 10, cook: 0, when: ['morning', 'afternoon'], col: '#ff8a6a' },
    { id: 'pasta', name: 'Tomato pasta', emoji: '🍝', needs: ['pasta', 'tomato', 'cheese'], at: 'stove', prep: 10, cook: 90, when: ['evening'], col: '#f08a4a' },
    { id: 'chicken', name: 'Chicken and rice', emoji: '🍗', needs: ['chicken', 'rice', 'carrot'], at: 'stove', prep: 12, cook: 110, when: ['evening'], col: '#e9b878' },
    { id: 'fish', name: 'Fish and veggies', emoji: '🐟', needs: ['fish', 'carrot', 'butter'], at: 'stove', prep: 12, cook: 100, when: ['evening'], col: '#cfe0ea' }
  ];
  // a starter shop's worth, so a new home's fridge isn't empty
  const STARTER = { egg: 4, milk: 2, butter: 1, bread: 2, cheese: 2, tomato: 3, apple: 3, banana: 2, oats: 1, honey: 1, carrot: 2, lettuce: 1, pasta: 1 };

  const has = (food, r) => r.needs.every(n => (food[n] || 0) > 0);
  // what to make: the kid's pick if there's everything for it, else something that suits the time of day, else
  // anything there's everything for (null: nothing, so a quick snack instead)
  function pick(food, part, wanted) {
    const can = RECIPES.filter(r => has(food, r)); if (!can.length) return null;
    const w = wanted && can.find(r => r.id === wanted); if (w) return w;
    const fit = can.filter(r => r.when.includes(part)); const list = fit.length ? fit : can;
    return list[Math.floor(Math.random() * list.length)];
  }
  const model = id => { const f = FOOD[id], k = new Kit(); f.shape(k); return k.build(); };
  // a plate with the meal on it (dirty: just crumbs and a smear)
  function plate(r, dirty) {
    const k = new Kit(); k.cyl(0.26, 0.03, 0, 0, 0, '#ffffff', { rt: 0.3, n: 18 });
    if (dirty) { k.ball(0.07, 0.05, 0.04, 0.03, '#d9c7a0', { s: [1.4, 0.2, 1], n: 6 }); k.ball(0.03, -0.1, 0.04, -0.05, '#c9a878', { n: 5 }); }
    else { k.ball(0.18, 0, 0.06, 0, r ? r.col : '#e8d2a6', { s: [1, 0.45, 1], n: 12 }); k.ball(0.05, 0.08, 0.12, -0.04, '#ffffff', { n: 6 }); }
    return k.build();
  }
  const pan = () => { const k = new Kit(); k.cyl(0.26, 0.12, 0, 0, 0, '#3d4a5a', { n: 16 }); k.box(0.42, 0.04, 0.06, 0.42, 0.08, 0, '#3d4a5a', { r: 0.02 }); return k.build(); };

  IH.kitchen = { FOOD, RECIPES, STARTER, has, pick, model, plate, pan };
})();
