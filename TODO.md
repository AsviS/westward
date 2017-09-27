World building
Design document
Clean code
Movement

Next dev log:
Networking, pathfinding & splines

* Cleaning:
- Clean up Utils
- Move Geometry to studio?
- Remove phaser_map and mapbis
- Split server in two (game and dev server)
- Order files in studio
- Standardize the use of Utils methods for coordianes manipulations (gritoline, lientogrid, tiletoiAOI, AOItotile, tileRelativeToAOI...)
- Have a universal ChunkEdit class used accross all tools for all types of modifications
- Clean Chunk and ChunkEdit for obsolete methods
- Sort-out shardness of Utils, and the need to have common properties such as tileWidth etc. readily available both in dev and prod
-----
*Moving:
- Client-side networking stuff
- Use of spaceMap
- Modify getNode
- Hold & click
- Verticality stuff
-----
* Deployment
- Two repositories, for production and development, with node scripts taking care
of copying what is needed from one to the other (+ uglifying and compressing etc.)
-> Possible to programmatically push?  http://radek.io/2015/10/27/nodegit/
- Somehow remove/disable debug components automatically
- Desktop app a simple terminal that gets everything from server (= exact same
appearance and behaviour, reduced code visibility, and possibly *no* node-modules)
- Scripts to group what is needed for the app, uglify/compress and build
- Migrate Geometry to server to hide it?
- Secure chunk access? (check client position before serving)
-----
* Tools:
- Top-down visibility optimization (create a lookup table of transparency)
- Prune map files more
- Testing (make part of the pipeline)
-----
* World editor:
- Get path from bezier
Alt:
- Check Google static maps
- Convert image to gray levels
- Display mouse coordinates on the fly
- Analyze coast automatically


Axes of progress:
- Battle system
- Exploration
- Trade
- Crafting
- Settlement defense
- Settlement economy
- Polish (footsteps, sound and light effects, HUD...)
- Tutorial
- Daily quests
- Map
+ World building, design document, clean code...