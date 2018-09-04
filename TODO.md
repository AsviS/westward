Bugs:
- Animals occupying same battle cell
- Spawning in battle area, moving: doesn't stop movement
- Gray out sell inventory in shop as well?

Spatial issues:
- Spotting for aggro / aggro distance
- Next to
- Including new entities when battle expands
- Entering battle when moving into area
- Deciding size of battle area

Release:
- Newplayer only (flush)
- Dis/enable battles
- Push
- Reset food, update stocks

Daily: design doc, world building, comments system

Part I: Mechanics
Part II: World building
Part III: Atmosphere & polish
Part IV: Cleaning, optimization and admin

Pillars:
1) The War
2) The Economy
3) The Wild

Chapter 1
1) The War
- Raids
-> onConnect: send civs (k closest?)
-> onCampUpdate: pick k civs, identify closest player, attack
-> Wander around camp
- Towers (add auto-detect in gs.checkForAggro)); skip turns of non-fighting buildings
- Settlers counterattacks (attacking buildings)
- Set locations of a few camps
- Fix bombs details
2) The Economy
- Resource flows between buildings, incl. gold generation
- Introduce new wood ingredient obtained from timber (logs?)
- Fix the right amount of buildings in each settlement, their output per turn, turn duration
+ set suitable stocks to bootstrap economy
- Starvation (impact) (think of ways to make it painfully visible)
- Settlement-oriented HUD: see below
- Missions menu
(-> Eventually: missions, quests & achievements)
(-> Missions: bring food, defend, commit, follow chancellor directives,
defend trade routes, scout, maintain supplies)
(-> Control quests distribution?    )
3) The Wild
- Fog of war (timed)
- Icons synchronization

Chapter 2
1) The War
- Barracks and troops
- Fortified civ camps, rebuilds
2) The Economy
- Permanent, named players
- Governor (fixed) & officials
- Dev. levels
- Impact on crafting, buildings, ...
- New World (https://worldspinner.com/)
- New buildings, settlements expansion
3) The Wild
- Resources & misc map icons
- Trade routes (chancellors only), mark on maps

Chapter 3:
1) The War
- Unit types & counters
- Advanced battle mechanics & UI
- Automated raids by commander, displayed to entice players
2) The Economy
- Elections
- Taxes
- Citizenship changes
- Homeland trade
- Cash crops
- Economy orientation by chancellors
- Backpacks, purses, belts, gloves (remove shields) ...
- War economy (tower ammunitions, ...)
3) The Wild
- Fatigue & rest, impact on everything
- Different pelts and leathers, rework crafting recipes, full pelt economy

Chapter 4:
Fancy title screen (with number of players, events stream, map background...)
Class selection
Player abilities
Advanced XP systems
Class quests & civic quests (endless supply in missions menu)
Personal shops & caravans
World-building: items, fauna & flora
Corresponding spawn mechanics
Corresponding admin tools
Advanced crafting mechanics & interface
Recipes mechanics
Tiers, brittleness, ...
New geography, adding world content
Corresponding editing tools
Ambient elements
Civ style
Advanced civ mechanics
Messaging
Advanced social features
Diplomacy
...



Interface upgrades:
- Class selection
- Settlement selection
- Crafting menu
- Battle interface
- HUD


UI
# Put settlement to the forefront
- Name next to minimap
- Lvl, # citizens, # buildings?, # troops
- Food (also update prod and build panels)
- Security? 
- Bell icon when attacks
- Blinking icon on map when attacks?
- Displayed for the settlement currently visited
- Help icon to invite to visit fort for more details
- Compass icon pointing towards local Fort at all time (if equipped)
- Death icons + "last attacks" icons
- Display health bar of buildings? Show damage somehow (smoke w/ particles?)

Misc:
- Re-introduce movement marker, not square, make it lag behind and wiggle below cursor? 



##################################################
##################################################
##################################################

* Battle system
* Civics
* Character panel
* Craftsmen gameplay
* Enemy civ
* Explorer gameplay
* Merchant gameplay
* Packaging
* Settlement defense
* Settlement economy
* Soldier gameplay
Design document
World building
Free

#####################################################
#####################################################
#####################################################

Admin
Analytics
Cleaning
* Battle system
* Civics
* Character panel
* Craftsmen gameplay
* Enemy civ
* Explorer gameplay
* Help
* Inventory
* Merchant gameplay
* Misc
* Orientation
* Packaging
* Settlement defense
* Settlement economy
* Soldier gameplay
Deployment
Design document
Faking
Polish
Testing
World Building
Free

###############
V1 level:
###############

Admin
-----
Import db
-> Iterate over import object, if matching id in db, update fields, if not, insert new entry 
Set coordinates
Set settlement parameters
Maintenance mode
Secure

Analytics:
---------
- Display events in admin
- Look for nice statistical library
- Log drains and faucets
- Log where items are bought/sold
- Log pathfinding destinations, consider making heatmap in the long term
- Log as many things as possible: session duration, distance travelled per session, time spent in settlement per session, in nature per session,
interactions with buildings, time spent in each individual menu, etc.
- Cluster "heavy" players vs "small-time" players and look for differences between the two
- Analyze sessions of one-time players who never come back
- Find other meaningful clusters (maybe in unsupervized fashion)
- Compare behaviors to how you expect the game to be played

Cleaning:
--------
Performance:
- Much batter position handling
- Server-side, have all entities maintain Rect objects for proximity computations (e.g. checkForBattle etc.)
- Remove unnecessary files
- Use pool for notifications
- Avoid duplicate pins in maps, danger pins etc.
- Fix "already existing/non-existing" bugs
- "Sleep" mode for NPC when no player in currentAOI.entities (change flags on AOI transition, not on every NPC update loop iteration)
-> Also applyes to aggro detection
- Pathmaking instead of pahfinding?
- Concile the two coexisting menu update systems: the one used by updateSelf and the one used by updateBuilding
-> All menus have an update() method called on display; upon new server data, only update() the current menu
-> DOn't call all updates on display; update when receiving server data, and that's it
- Dont send full building inventories when buying/selling (send arrays of deltas)
- Fix null values in left-fringe chunks (fixed?)
->nulls in corrupted chunks likely arise from "undefined" values being converted to null by JSON.stringify
-> Happens on the fringe -> because for these drawShore returns undefined?!
- listCollisions: don't store water tiles, only shore etc. (! beware of impact on trailblazer)
- Flattening: second pass to delete water-only chunks based on visibility
- Flattening based on transparency
- Store tiles of the shape of a building somewhere instead of recomputing (e.g. in canBuild) [May be obsolete if buildings have rect shapes in future]
Order:
- Proper initial cursor (using continuous polling or sth?)
- Central shared list of entities
- Remove global engine hover/out events, use local ones in animals, buildings...
- From 10.0: use pointer.worldX and worldY to handle location clicks
- Send a digested config file from server to client
- Add as much stuff as possible to config file
- Deal differently with net updates when visibility lost (https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API)
- Reimplement maps using containers
- Refactor building management, shapes, positioning... (from bottom-left)
- Use containers
- Clean schemas
- Use data registry for data exchange between scenes (see Phaser World 119)
- Client-side, GameObject use tx and ty while Moving use tileX and tileY (and they both have a setPosition method)
=> fix in processItemClick, etc, test a lot
- Clean scene transition code
- Move UI stuff from Engine to UI
- Building update: somehow check for fields in data not in map, and make a warning?
- Remove quick fixes about setFrame (big buttons, ctrl+f on quick fix)
- "getName()" method to get items names rather than accessing dict
- Rework longslot system
- Rethink the calling of all events on menu open
- Setters/getters everywhere
- Client-side, move common update elements of player and animal to new moving.update()
- StatsManager (NetworkManager?)
- Clean up Building.update() and updateSelf()
- Centralize all texts (incl. stats, equip, and even item descriptions)
- Remove the shop-specific code from enterBuilding (use onEnter event if need be, manage inventory filters properly)
- Remove unnecessary files (esp. sprites)
- Remove "longslot" stuff intended for stretching longslots vertically?
- Find out how to generate graphics objects (grid tiles, gradients...) programmatically for various uses
- One clean, central way to manage tilesets, config variables, depth, blitters... (blitter selection in client/Chunk, "mawLayer" field in WorldEditor ...)
- Give toString method to custom objects to replace [this.constructor.name this.id] ...
- Decide what to do with assets/maps folder, both for dev and prod
- Split server in two (game and dev server)

Content:
-------
* Ambiance
- From : https://forums.rpgmakerweb.com/index.php?threads/whtdragons-animals-and-running-horses-now-with-more-dragons.53552/
-> Add seagulls, birds, frogs, small mammals, fishes (tinted), ...
-> Have fun with unicorn
- Carcasses, traces of fight
- Paths along most-travelled paths
- Location sfx for each building
- Maximum ambient noises
-> Multiple categories (weather, animals, terrain...), distinct random intervals
* Battle system
- Bombs:
-> Stats??
-> Greater effect against buildings
-> Sound effect
-> Throw animation?
-> Variable damage based on bomb type
-> Factor defense in
- traps, poisons, potions, oils...
- burn effects inflicted by (crimson?) explosives
(-> trap bonuses to explorers? Natural crafting recipe to them?)
- Increase fatigue when fighting
- Effect of fatigue on fighting
( - Camera follows active figher? Could be more dynamic ; possibly with deadzone to avoid twitch)
- Gunpowder mechanics; remove it from bullet recipe?)
(- New interface:
Timer at bottom, icon of active fighter on the left, queue of others on the right
Skip turn below
Health and fatigue above, numerically + battle counters (movement, actions...)
Belt slots above + ammo slots + active weapon (ranged vs melee)
=> Allow both melee & ranged equipped at same type, ranged active by default)
(- Compute probability of items breaking and discard them)
(- Identify characters in the way of ranged attacks)
(- Anti-friendly fire safety for bombs)
(- Display health of enemies somehow)
(- Let NPC use items (restore health, ...))
(- 3-way battles)
* Civics
- Civic abilities
- Elections
- Naming officials
(- variable civic xp when committing, based on factors
- Taxes
- Change settlement
- Update population based on players (requires permanent players)
- Server side: check that not committing twice to same building)
* Character panel
-> Indicate starvation level of settlement
- restore "setClass" to use to compute different XP gains per class
- Adjust XP gains per class
- Display health, fatigue and gold permanently in HUD
- Remove % stats panel
- Redisplay committment slots
- Ability points
- Ability system
- Events log
- Add help back
* Craftsmen gameplay
- Think of short, nice names 
- Abilities
- Lock some recipes on abilities
- At some point, made scrollable recipes panel 
- Quests
- Mystery potion that uses all plants in game, as a challenge
- Lock some recipes based on dev level
-> keep locked recipes but disable them (indicate why)
(
- XP based on multiple factors
Backpacks, gold pouches of various sizes...)
(- Recipes for golden ore -> gold ingots -> currency)
(- Tiers)
(- Upgrades)
(- Naming)
(- Dismantling)
(- Distinct interfaces for forging & brewing?
-> Furnace mechanics? (Duration and temperature, coald and/or wood as fuel...)
-> Brewing mechanics? (Brew duration, fuel as well...))
(- Add dosage mechanic when brewing) 
(- Full list of items)
* Explorer gameplay
- Map mechanics:
- Buggy building centering in fort?
-> Zoom:
--> Fix zoom-out out of map bounds
--> Zoom in/out with scroll 
--> Decide what level of zoom for Fort and Minimap
-> Data sync:
--> Iterate over markers of one map, if not in second map, add them
--> Each player memorizes own markers (when building is displayed in surrounding AOIs), reset when visitting fort
--> Danger markers automatically added to map when player dies
--> Destoyed building: automatically deletes marker in corresponding fort
--> Sync when visitting fort
--> Fort sync first: absorb markers from player, reset player
--> Player sync: copy fort markers
-> Fog of war:
--> Map instance stores list of AOIs together with timestamp
--> Player memorizes visitted AOIs
--> Two-way sync when visitting fort
--> Mini-masks per AOI, only applied if timestamp smaller than x
--> Work-out nice geometry
-> Clusters:
--> Split both zoom-level into chunks
--> Map all AOIs and markers to world map chunks
--> download only the relevant chunks, on the fly
-> Minimap: circular mask, no zoom buttons, no drag/drag following player, no fog of war
-> Future: custom markers, not synced
-> Future: markes about animal and plant populations, synced with fort, can be enabled/disabled on map
- Quests
- Civic XP when synchronizing enemy camps
- Less XP based on lvl (up to 0 XP around settlements past a certain level)
- Bonuses
- Show plant markers based on ability
* Enemy civ
// Lookup "tribal concept art" for inspiration on civs look
//: one single building type that spawns civs at regular intervals + map icons
-> Sprinkle several camps around settlements
- Inclusion of buildings in fights
- Targetting of buildings by civs
- Processing of attacks, destruction
- Settlement attack behavior (what time intervals, how many...)
- Allow players to attack buildings
- Tower behavior
- Auto-repair (for both settlers and civs), link to commitment
(- Wander behavior (squad), patrols
- Territory zones: if player step in, send small squad to track
- Name generator
- Camp economy
- Civs loot equipment and equip it
- Civs gain XP, level-up, become stronger (increase associated xp reward accordingly)
- Reflect that in hover card
- Test NPC vs animals)
* Help
- Review existing help buttons
- Add missing help buttons (including on specific lines to describe fatigue, food surplus...)
- Make tutorial quests (commitment & civic xp, battle, crafting...)
- Pop-up boxes describing things first time (first time in fort, workshop, character menu...)
* Inventory
- Click window: display stat effects
- Belt mechanics (quick-use slots for potions, bombs and weapons)
- Backpack mechanics
- Gunpowder mechanics (multiple pouches?)
- Dropping items
* Merchant gameplay
- Shops
- Caravans
- Homeland trade
- Inns
- Quests
- Bonuses
- Tax evasion
- Less XP based on level
* Misc
- Fatigue 
-> Accumulate it with actions, server-side ("stamina"): walking, committing, crafting, ...
-> Relate to food surplus
-> Display in character panel
-> Impact on actions
- Rest
- Campfires (+ leftovers + orientation pin + long distance smoke pins)
- Fix continuous movement system
- New camera system? ("dead zone")
=> Try new Phaser 3.11 deadzone first 
https://www.gamasutra.com/blogs/ItayKeren/20150511/243083/Scroll_Back_The_Theory_and_Practice_of_Cameras_in_SideScrollers.php
-> Doesn't follow in central rect window, only follows when getting out of it and until player stops
( allows for small position adjustments)
or
-> Doesn't follow (except in battle)
-> Only follow when click destination is in screen margins (define margins size)
-> Space to interrupt movement?
or
-> Moves when cursor on sides (refresh pins), to some extent
-> Also moves using keystrokes; space to center
- Respawn losses?
- Messaging
- Leaderboards
- View info on other players (levels...)
- Guilds
* Orientations
-> Use new Phaser 3.11 Camera.worldView for on-screen checks
- Pins for gunshots and explosions (requires special networking for long-distance sounds)
-> Much slower noise variation according to distance (since heard from very far)
-> Pin disappears after a few seconds
- Pins for alarm bells (same)
* Packaging
-> Determine new player by querying server
-> Nb connected, permanent players, player names, ..
-> Cheat-proof
* Settlement defense
- Enable commander to build towers
- Buildings health
- Show updated health in fort
- Set up stats of towers and forts
- Towers behave as animals and trigger fights (same battle behavior)
- Manage arrows stock? Need for arrow economy? Ammo economy?
- Same with forts
- Enable commander to build barracks
- Production of NPC troops
- Set up stats of troops
- Make troops engage enemies
- Troops control: no grouping with players, but list of orders to dispatch
-> Orders: go guard location x, patrol at location x
-> NPC will deploy appropriate move behavior accordingly and aggro any enemies automatically
(+ add in check for aggro code, detection of neighboring battle cells, so it intervenes in ongoing fights too)
-> Map-based interface in the fort, on the left list of troops (with randomly generated names),
select them, select order, and select location
-> NPC lvl-up like players, full soldier mode, improve battle abilities (can be checked in menu)
-> "training mode", costs money and food, make soldier unavailable, comes back lvled-up (higher level, higher cost)
-> Each has own equipment; resource flow to barracks, all items stored there can freely be assigned
to soldiers 
-> For training and change of equipment, soldier need to be at barracks to make changes ("come back" order)
- Maintaining troops consumes food as well (more than players? Less?)
* Settlement economy
Stop sending commit slots repeatedly
Hide commit button when already committed
Implement and test decommitment from db data
Modify update commit code to accomodate for commitment of > 1 turn
Have hunter huts produce pelts (good for leather economy)
Recipe: paper cartridges (paper also for bombs?)?
Make recipes (randomly?) for 5 consumables (potion, antidote, steady stuff...) + create ingredients
Recipes for fancy bullets and bombs
- Resource flow from all resource buildings to trade post
- Gold flow from tarde post to fort
- Fork trade post gold flow to fork and workshop
- Set reward of recipes for settlement (0 = disabled)
- Make spawn zones for plants/shrooms/etc.
- Dev levels
- Impact of dev level on exploration XP reward
- Let chancellor set prices in trade post
- Trade with overseas
- Salaries for officials, taxes
- Allow creation of new buildings (fixed locations to begin with)
- Lists of items rewarded by civic xp
* Soldier gameplay
- New compute battle destination in server/NPC?
- Battle cursors use new "next to" logic
- Monster variety & more spawn zones
- Abilities
- Quests
(- Whole ecology, variants of animals along north/south axis,
-> Brown wolves south, black ones south more powerful, same with gray and white wolves north
+ unicorn
- Rare/strong foes)
(- Advanced XP)

Deployment:
----------
- Flatten chunks and reduce them to arrays only
- Code to load flattened chunks in game
- Separate as much as possible the code required for production and the code required for testing
- Tool to gather, uglify and compress all relevant source files and move them to production directory
- Automate git upload to Heroku (http://radek.io/2015/10/27/nodegit/)
- Full pipeline: flatten->gather->upload (flatten and gather not necessary for 100% of commits, so need to be able to select them with flags)
- Tool to automatically merge all graphic assets in atlases?
- Way to interact with Node server online, without restarting (e.g. change variables, reload data...)
- Improve flattening by making transparency checks
- Secure chunk access? (check client position before serving)
- Desktop app (automated)

Design document:
---------------
- Add recent ideas about soldier control (see settlement defense)
- Re-read, update with recent ideas
- Decide list of buildings, items, ...
- Make Excel tables (crafting, inventory, bestiary, ...)
- Make powerpoint
- Make feature matrix
- Consequence graphs
- Tidy up (charts, tables, Latex formulas...)
- For v1 schedule: follow https://www.youtube.com/watch?v=moW8-MXjivs priorization method from (36:00)

Polish:
------
Visual:
- Use new Phaser 3.11 setTintFill to add halo over hovered game entities?
- Add weapons to temporary character sprites
- More dramatic apparition of battle tiles
- Hide move marker (use different mouse cursors for can/can't walk to)
- "Tip of the day"
- Revamp class selection
- Fix continuous movement
- Polish title screen (leaves, bird passing in the distance...)
- Fade-in/out transitions (wait for containers?)
- Show "new" tag when opening inventory
- Cut corners of big battlezones? (but make sure it doesn't impact integrity: save integrity path and used it for that)
- Variety of small "talk" bubbles in reaction to things happening (+ symbol bubbles?)
- Adapt bubble duration (in bubble.display) depending on number of words
- Add dirt below buildings
- Animation when using item, throwing item, equipping... (reactive, before getting network response)
- Hover frame for closing cross
- Hover background for inventory tiles?
- Hower card over gold indicator
- When hovering equipment, highlight corresponding equip slot
- Use particle emitters for several cool effects, like cloud puffs, dust when walking, lights, etc.
- Light effect layer (https://www.codeandweb.com/texturepacker/tutorials/how-to-create-light-effects-in-phaser3)
- Add cloud silhouettes
- Custom movement marker
- Use matter.js to simulate wind on leaves? (Dead/alive leaves flying on screen)
Sound:
- Sound effects when clicking (for moving, on buttons in menus, sounds of shuffling pages...)
- Noise when walking
- Noise when clicking on building (each building its noise)
- Noise when clicking on non-walkable tile
- Unique noise for items
- Crafting SFX
General:
- Keyboard shortcuts for menus?
- Categories of items? (How to concile with various backpack sizes)? Sorting of items?
- Polish existing content
- Light effects
- HUD, title screen, animations ...
- Varied and nice landmarks to give life to the world and act as waypoints

Testing:
-------
- Make numeric simulations linking everything:
-> Time to acquire dev level goals based on building production rates, varying number of buildings, productivity, etc.
-> Evolution of food surplus based on number of players, buildings, etc.
-> Set all these paremeters in a virtual settlement, simulate one day/week/month/year buy iteratively computing all cycles and their consequences in that time, then see results
- Figure out testing:
- Have a test server, test database a test map set up
- Open browser and run test script in test world
- Manually run it before deployment
- Have the testing pipeline work with both development and production code (run it once, prodify, then check again, the upload)
- Optimize: remove divisions, benchmark runtimes, etc.

World building:
--------------
1/ World creation:
Multilayer image:
- One layer for coastlines; trace SVG path, modify manually and then recompute and export path as blueprint
+ fill nodes
- One layer for forests, based on color detection; consider saving trees in separate data structure (and displaying them as single images like buildings)
Creation:
- One script reads blueprints, create chunks with coastlines, fill water
- (If tiled-trees: one script to apply them)
NB: trees as images opens the way for ecology dynamics: trees disppearing with time, timber supply
diminishing, ...

2/ Cartography
- Has to come from actual in-game world
- Capture whole game map, with trees and all terrain elements
- Do so at arbitrary zoom levels
(- split in chunks)
- Apply post-processing effects to make it look nice

3/ World editor
-> Need to visualize game world at different zoom levels
-> Display and modify buildings
-> Display and modify spawnzones
-> Manage trees?
-> Integrate with admin to display and modify settlement data (+ events etc.) 

4/Chunk editor: used Tiled in world mode
5/Building editor (visually define shape, collisons, etc.)
--
Custom chunk/world editor:
- Arrows on the fringes of the window allow to move quickly to adjacent chunks
- See borders of adjacent chunks to match fringe tiles
- Preserve whatever extra info is in the JSON file (vs Tiled who rewrites it)
- Versioning of individual chunks (saved in separate folder), for unlimited undos
- Add random elements (w/ scripts to remove them):
Building editor (set shapes etc.)
Manage spawn zones in editor
-> Patches of dirt
-> Tree decorations: flowers, stones, bushes
- Add cliffs in empty areas
-> Add random decorations to cliffs (stones in bends, ...)
- Compute tree density and spread random trees around accordingly?
- No tree if busy 3cells to the left? Or when planing tree, log width cells to right as no-go position
- Fix loops (lakes ...)
- Plan for more layers in dev
- Store forests and trees separately (trees.json) during dev?
-> During flattening, read that file and draw trees tile by tile
-> Test high-layers after flattening


UI:
---
- 8-directional characters, + attack (ranged & melee), object, die animations ...
- Movement target indicator
- Better battle tiles
- Battle UI
- Crafting/Workshop UI
- Better orientation pins (w/ way to indicate if in-fight)
- Better new player screens (class selection, settlement selection...)
- Abilities screen, civic screen...
- Landscape, trees, ...
- Animals (w/ animations)
- Enemy civs, enemy camps 
- Logo 