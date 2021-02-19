function rotateAndPaintImage ( context, image, scale, angleInRad , positionX, positionY, axisX, axisY ) {
    context.translate( positionX, positionY );
    context.rotate( angleInRad );
    context.scale(scale, -scale);
    try {
        context.drawImage( image, -axisX, -axisY );
    } catch (e) {
        console.log(e);
    }
    context.scale(1 / scale, -1 / scale);
    context.rotate( -angleInRad );
    context.translate( -positionX, -positionY );
}

var imgSprite = new Image();
imgSprite.src = "coffee-long.jpg";

let zelBodySprite = new Image();
zelBodySprite.src = "zel-drawn.png";

let armSegmentSprite = new Image();
armSegmentSprite.src = "arm-segment.png";

let coffeeSprite = new Image();
coffeeSprite.src = "coffecup.png";


function drawImageOnFixture(fixture, image, imageSize, fixtureSize) {
    let body = fixture.GetBody();
    let pos = body.GetWorldPoint();
    let rot = body.GetAngle();
    let x = pos.get_x();
    let y = pos.get_y();
    rotateAndPaintImage(
        context,
        image,
        fixtureSize / imageSize,
        rot,
        x, y, imageSize / 2, imageSize / 2
    );
}


function averageAngles(angles) {
    let n = angles.length;
    let sum = (a, b) => a + b;
    return Math.atan2(
        angles.map(x => Math.sin(x)).reduce(sum, 0) / n,
        angles.map(x => Math.cos(x)).reduce(sum, 0) / n,
    );
}


var embox2dTest_ropeJoint = function() {
    //constructor
    this.large_box = null;
    this.arm_segments = [];
    this.coffeeParticles = [];
}

embox2dTest_ropeJoint.prototype.setNiceViewCenter = function() {
    PTM = 24;
    setViewCenterWorld( new b2Vec2(0,8), true );
}

function drawArmLines(armSegments, lineWidth, strokeStyle) {
    let arm_points = armSegments.map(x => x.GetBody());
    context.lineWidth = lineWidth;
    context.strokeStyle = strokeStyle;
    context.lineCap = 'round';
    context.beginPath();
    context.moveTo(arm_points[0].GetWorldPoint().get_x(), arm_points[0].GetWorldPoint().get_y());
    for (let i = 1; i < arm_points.length; ++i) {
        let pos = arm_points[i].GetWorldPoint();
        context.lineTo(pos.get_x(), pos.get_y());
    }
    context.stroke();
}

embox2dTest_ropeJoint.prototype.draw = function() {
    drawArmLines(this.arm_segments, 0.5, 'rgb(0,0,0,1)');
    drawArmLines(this.arm_segments, 0.35, 'rgb(180,180,180,1)');
    let coffeeAngle = (this.arm_segments[0].GetBody().GetAngle() + Math.PI * 200) % (Math.PI * 2);
    // console.log(coffeeAngle);
    if (coffeeAngle > 0.2 && coffeeAngle < 3) {
        // console.log('!');
        let body = this.arm_segments[this.arm_segments.length - 1].GetBody();
        let speed = body.GetLinearVelocity();
        let pos = body.GetWorldPoint();
        this.coffeeParticles.push({
            x: pos.get_x(),
            y: pos.get_y(),
            vx: 0.15 * Math.sin(coffeeAngle + Math.PI * 1.5) + (Math.random() * 0.1) - 0.05,
            // vy: -0.1 * Math.cos(coffeeAngle + Math.PI * 1.5),
            vy: 0,
            s: (0.1 + Math.random() * 0.1)
        })
    };
    for (let i of this.coffeeParticles) {
        i.x += i.vx;
        i.y += i.vy;
        i.vy -= 0.02;
    }
    this.coffeeParticles = this.coffeeParticles.filter(i => i.y > -1000 && i.y < 1000);
    for (let i of this.coffeeParticles) {
        context.lineWidth = i.s;
        context.strokeStyle = 'rgb(0,0,0,1)';
        context.lineCap = 'round';
        context.beginPath();
        context.moveTo(i.x, i.y);
        context.lineTo(i.x, i.y);
        context.stroke();
    }
    // let angles = this.arm_segments.map(x => x.GetBody().GetAngle());
    // for (let i = 0; i < this.arm_segments.length; ++i) {
    //         let body = this.arm_segments[i].GetBody();
    //         let pos = body.GetWorldPoint();
    //         let rot =
    //             averageAngles([
    //                 angles[i],
    //                 angles[Math.max(0, i - 1)],
    //                 angles[Math.min(angles.length - 1, i + 1)]
    //             ]);
    //         let x = pos.get_x();
    //         let y = pos.get_y();
    //         rotateAndPaintImage(
    //             context,
    //             armSegmentSprite,
    //             6 / 512,
    //             rot,
    //             x, y, 512 / 2, 512 / 2
    //         );
    // }
    if (this.arm_segments.length != 0) {
        drawImageOnFixture(this.arm_segments[this.arm_segments.length - 1], coffeeSprite, 112, 1.8);
    }
    rotateAndPaintImage(
        context,
        zelBodySprite,
        12 / 512,
        0,
        0, 12,
        256, 256
    );
}

embox2dTest_ropeJoint.prototype.setup = function() {
    //set up the Box2D scene here - the world is already created
    var ground = world.CreateBody(new b2BodyDef());
    {
        var shape = new b2EdgeShape();
        shape.Set(new b2Vec2(-40.0, 0.0), new b2Vec2(40.0, 0.0));
        ground.CreateFixture(shape, 0.0);
    }

    {
        let segSize = 0.5;
        var shape = new b2PolygonShape();
        shape.SetAsBox(0.125, segSize);

        var fd = new b2FixtureDef();
        fd.set_shape(shape);
        fd.set_density(20.0);
        fd.set_friction(0.2);
        fd.get_filter().set_categoryBits(0x0001);
        fd.get_filter().set_maskBits(0xFFFF & ~0x0002);

        var jd = new b2RevoluteJointDef();
        jd.set_collideConnected(false);


        var N = 16;
        var y = 12.7;
        var ropeDef = new b2RopeJointDef();
        ropeDef.get_localAnchorA().Set(0.0, y);

        var prevBody = ground;
        for (var i = 0; i < N; ++i)
        {
            var bd = new b2BodyDef();
            // bd.set_type(b2_dynamicBody);
            bd.set_type(Module.b2_dynamicBody);
            bd.set_position(new b2Vec2(0, y - segSize * i - 0.5));

            var body = world.CreateBody(bd);

            this.arm_segments.push(body.CreateFixture(fd));

            var anchor = new b2Vec2(0, y - i * segSize);
            jd.Initialize(prevBody, body, anchor);
            world.CreateJoint(jd);

            prevBody = body;
        }

        {
            var bd = new b2BodyDef();
            // bd.set_type(b2_dynamicBody);
            shape.SetAsBox(1.5, 1.5);
            fd.set_density = 100.0;
            fd.get_filter().set_categoryBits(0x0002);
            bd.set_type(Module.b2_dynamicBody);
            bd.set_position(new b2Vec2(0, y - segSize * N));
            bd.set_angularDamping(0.4);

            var body = world.CreateBody(bd);

            this.large_box = body.CreateFixture(fd);

            var anchor = new b2Vec2(0, y - N * segSize);
            jd.Initialize(prevBody, body, anchor);
            world.CreateJoint(jd);

            prevBody = body;
            this.large_box = body.CreateFixture(fd);
        }

        ropeDef.set_localAnchorB(new b2Vec2(0,0));

        var extraLength = 0.01;
        ropeDef.set_maxLength(N + extraLength);
        ropeDef.set_bodyB(prevBody);
    }

    {
        ropeDef.set_bodyA(ground);
        world.CreateJoint(ropeDef);
    }
}

var e_shapeBit = 0x0001;
var e_jointBit = 0x0002;
var e_aabbBit = 0x0004;
var e_pairBit = 0x0008;
var e_centerOfMassBit = 0x0010;

var PTM = 32;

var world = null;
var mouseJointGroundBody;
var canvas;
var context;
var myDebugDraw;        
var myQueryCallback;
var mouseJoint = null;        
var run = true;
var frameTime60 = 0;
var statusUpdateCounter = 0;
var showStats = false;        
var mouseDown = false;
var shiftDown = false;        
var mousePosPixel = {
    x: 0,
    y: 0
};
var prevMousePosPixel = {
    x: 0,
    y: 0
};        
var mousePosWorld = {
    x: 0,
    y: 0
};        
var canvasOffset = {
    x: 0,
    y: 0
};        
var viewCenterPixel = {
    x:800/2,
    y:600/2
};
var currentTest = null;

function myRound(val,places) {
    var c = 1;
    for (var i = 0; i < places; i++)
        c *= 10;
    return Math.round(val*c)/c;
}
        
function getWorldPointFromPixelPoint(pixelPoint) {
    return {                
        x: (pixelPoint.x - canvasOffset.x)/PTM,
        y: (pixelPoint.y - (canvas.height - canvasOffset.y))/PTM
    };
}

function updateMousePos(canvas, evt) {
    var rect = canvas.getBoundingClientRect();
    mousePosPixel = {
        x: evt.clientX - rect.left,
        y: canvas.height - (evt.clientY - rect.top)
    };
    mousePosWorld = getWorldPointFromPixelPoint(mousePosPixel);
}

function setViewCenterWorld(b2vecpos, instantaneous) {
    var currentViewCenterWorld = getWorldPointFromPixelPoint( viewCenterPixel );
    var toMoveX = b2vecpos.get_x() - currentViewCenterWorld.x;
    var toMoveY = b2vecpos.get_y() - currentViewCenterWorld.y;
    var fraction = instantaneous ? 1 : 0.25;
    canvasOffset.x -= myRound(fraction * toMoveX * PTM, 0);
    canvasOffset.y += myRound(fraction * toMoveY * PTM, 0);
}

function onMouseMove(canvas, evt) {
    prevMousePosPixel = mousePosPixel;
    updateMousePos(canvas, evt);
    updateStats();
    if ( shiftDown ) {
        canvasOffset.x += (mousePosPixel.x - prevMousePosPixel.x);
        canvasOffset.y -= (mousePosPixel.y - prevMousePosPixel.y);
        draw();
    }
    else if ( mouseDown && mouseJoint != null ) {
        mouseJoint.SetTarget( new Box2D.b2Vec2(mousePosWorld.x, mousePosWorld.y) );
    }
}

function startMouseJoint() {
    
    if ( mouseJoint != null )
        return;
    
    // Make a small box.
    var aabb = new Box2D.b2AABB();
    var d = 0.001;            
    aabb.set_lowerBound(new b2Vec2(mousePosWorld.x - d, mousePosWorld.y - d));
    aabb.set_upperBound(new b2Vec2(mousePosWorld.x + d, mousePosWorld.y + d));
    
    // Query the world for overlapping shapes.            
    myQueryCallback.m_fixture = null;
    myQueryCallback.m_point = new Box2D.b2Vec2(mousePosWorld.x, mousePosWorld.y);
    world.QueryAABB(myQueryCallback, aabb);
    
    if (myQueryCallback.m_fixture)
    {
        var body = myQueryCallback.m_fixture.GetBody();
        var md = new Box2D.b2MouseJointDef();
        md.set_bodyA(mouseJointGroundBody);
        md.set_bodyB(body);
        md.set_target( new Box2D.b2Vec2(mousePosWorld.x, mousePosWorld.y) );
        md.set_maxForce( 1000 * body.GetMass() );
        md.set_collideConnected(true);
        
        mouseJoint = Box2D.castObject( world.CreateJoint(md), Box2D.b2MouseJoint );
        body.SetAwake(true);
    }
}

function onMouseDown(canvas, evt) {            
    updateMousePos(canvas, evt);
    if ( !mouseDown )
        startMouseJoint();
    mouseDown = true;
    updateStats();
}

function onMouseUp(canvas, evt) {
    mouseDown = false;
    updateMousePos(canvas, evt);
    updateStats();
    if ( mouseJoint != null ) {
        world.DestroyJoint(mouseJoint);
        mouseJoint = null;
    }
}

function onMouseOut(canvas, evt) {
    onMouseUp(canvas,evt);
}

function onKeyDown(canvas, evt) {
    //console.log(evt.keyCode);
    if ( evt.keyCode == 80 ) {//p
        pause();
    }
    else if ( evt.keyCode == 82 ) {//r
        resetScene();
    }
    else if ( evt.keyCode == 83 ) {//s
        step();
    }
    else if ( evt.keyCode == 88 ) {//x
        zoomIn();
    }
    else if ( evt.keyCode == 90 ) {//z
        zoomOut();
    }
    else if ( evt.keyCode == 37 ) {//left
        canvasOffset.x += 32;
    }
    else if ( evt.keyCode == 39 ) {//right
        canvasOffset.x -= 32;
    }
    else if ( evt.keyCode == 38 ) {//up
        canvasOffset.y += 32;
    }
    else if ( evt.keyCode == 40 ) {//down
        canvasOffset.y -= 32;
    }
    else if ( evt.keyCode == 16 ) {//shift
        shiftDown = true;
    }
    
    if ( currentTest && currentTest.onKeyDown )
        currentTest.onKeyDown(canvas, evt);
    
    draw();
}

function onKeyUp(canvas, evt) {
    if ( evt.keyCode == 16 ) {//shift
        shiftDown = false;
    }
    
    if ( currentTest && currentTest.onKeyUp )
        currentTest.onKeyUp(canvas, evt);
}

function zoomIn() {
    var currentViewCenterWorld = getWorldPointFromPixelPoint( viewCenterPixel );
    PTM *= 1.1;
    var newViewCenterWorld = getWorldPointFromPixelPoint( viewCenterPixel );
    canvasOffset.x += (newViewCenterWorld.x-currentViewCenterWorld.x) * PTM;
    canvasOffset.y -= (newViewCenterWorld.y-currentViewCenterWorld.y) * PTM;
    draw();
}

function zoomOut() {
    var currentViewCenterWorld = getWorldPointFromPixelPoint( viewCenterPixel );
    PTM /= 1.1;
    var newViewCenterWorld = getWorldPointFromPixelPoint( viewCenterPixel );
    canvasOffset.x += (newViewCenterWorld.x-currentViewCenterWorld.x) * PTM;
    canvasOffset.y -= (newViewCenterWorld.y-currentViewCenterWorld.y) * PTM;
    draw();
}
        
function updateDebugDrawCheckboxesFromWorld() {
    var flags = myDebugDraw.GetFlags();
    document.getElementById('drawShapesCheck').checked = (( flags & e_shapeBit ) != 0);
    document.getElementById('drawJointsCheck').checked = (( flags & e_jointBit ) != 0);
    document.getElementById('drawAABBsCheck').checked = (( flags & e_aabbBit ) != 0);
    //document.getElementById('drawPairsCheck').checked = (( flags & e_pairBit ) != 0);
    document.getElementById('drawTransformsCheck').checked = (( flags & e_centerOfMassBit ) != 0);
}

function updateWorldFromDebugDrawCheckboxes() {
    var flags = 0;
    if ( document.getElementById('drawShapesCheck').checked )
        flags |= e_shapeBit;
    if ( document.getElementById('drawJointsCheck').checked )
        flags |= e_jointBit;
    if ( document.getElementById('drawAABBsCheck').checked )
        flags |= e_aabbBit;
    /*if ( document.getElementById('drawPairsCheck').checked )
        flags |= e_pairBit;*/
    if ( document.getElementById('drawTransformsCheck').checked )
        flags |= e_centerOfMassBit;
    myDebugDraw.SetFlags( flags );
}

function updateContinuousRefreshStatus() {
    showStats = ( document.getElementById('showStatsCheck').checked );
    if ( !showStats ) {
        var fbSpan = document.getElementById('feedbackSpan');
        fbSpan.innerHTML = "";
    }
    else
        updateStats();
}

function init() {
    
    canvas = document.getElementById("canvas");
    context = canvas.getContext( '2d' );
    
    canvasOffset.x = canvas.width/2;
    canvasOffset.y = canvas.height/2;

    canvas.addEventListener('mousemove', function(evt) {
        onMouseMove(canvas,evt);
    }, false);

    canvas.addEventListener('mousedown', function(evt) {
        onMouseDown(canvas,evt);
    }, false);

    canvas.addEventListener('mouseup', function(evt) {
        onMouseUp(canvas,evt);
    }, false);

    canvas.addEventListener('mouseout', function(evt) {
        onMouseOut(canvas,evt);
    }, false);

    canvas.addEventListener('touchmove', function(evt) {
        onMouseMove(canvas,evt.changedTouches[0]);
    }, false);

    canvas.addEventListener('touchstart', function(evt) {
        onMouseDown(canvas,evt.changedTouches[0]);
    }, false);

    canvas.addEventListener('touchend', function(evt) {
        onMouseUp(canvas,evt.changedTouches[0]);
    }, false);

    canvas.addEventListener('touchout', function(evt) {
        onMouseOut(canvas,evt.changedTouches[0]);
    }, false);

    canvas.addEventListener('keydown', function(evt) {
        onKeyDown(canvas,evt);
    }, false);

    canvas.addEventListener('keyup', function(evt) {
        onKeyUp(canvas,evt);
    }, false);

    myDebugDraw = getCanvasDebugDraw();            
    // myDebugDraw.SetFlags(e_shapeBit);
    
    myQueryCallback = new Box2D.JSQueryCallback();

    myQueryCallback.ReportFixture = function(fixturePtr) {
        var fixture = Box2D.wrapPointer( fixturePtr, b2Fixture );
        if ( fixture.GetBody().GetType() != Box2D.b2_dynamicBody ) //mouse cannot drag static bodies around
            return true;
        if ( ! fixture.TestPoint( this.m_point ) )
            return true;
        this.m_fixture = fixture;
        return false;
    };
}

function changeTest() {    
    resetScene();
    if ( currentTest && currentTest.setNiceViewCenter )
        currentTest.setNiceViewCenter();
    updateDebugDrawCheckboxesFromWorld();
    draw();
}

function createWorld() {
    
    if ( world != null ) 
        Box2D.destroy(world);
        
    world = new Box2D.b2World( new Box2D.b2Vec2(0.0, -10.0) );
    world.SetDebugDraw(myDebugDraw);
    
    mouseJointGroundBody = world.CreateBody( new Box2D.b2BodyDef() );
    
    var e = document.getElementById("testSelection");
    var v = e.options[e.selectedIndex].value;
    
    eval( "currentTest = new "+v+"();" );
    
    currentTest.setup();
}

function resetScene() {
    createWorld();
    draw();
}

function step(timestamp) {
    
    if ( currentTest && currentTest.step ) 
        currentTest.step();
    
    if ( ! showStats ) {
        world.Step(1/60, 3, 2);
        draw();
        return;
    }
    
    var current = Date.now();
    world.Step(1/60, 3, 2);
    var frametime = (Date.now() - current);
    frameTime60 = frameTime60 * (59/60) + frametime * (1/60);
    
    draw();
    statusUpdateCounter++;
    if ( statusUpdateCounter > 20 ) {
        updateStats();
        statusUpdateCounter = 0;
    }
}

function draw() {
    
    //white background
    context.fillStyle = 'rgb(255, 255, 255)';
    context.fillRect( 0, 0, canvas.width, canvas.height );
    
    context.save();            
        context.translate(canvasOffset.x, canvasOffset.y);
        context.scale(1,-1);                
        context.scale(PTM,PTM);
        context.lineWidth /= PTM;
        
        // drawAxes(context);
        
        context.fillStyle = 'rgb(255,255,0)';
        world.DrawDebugData();
        
        if ( mouseJoint != null ) {
            //mouse joint is not drawn with regular joints in debug draw
            var p1 = mouseJoint.GetAnchorB();
            var p2 = mouseJoint.GetTarget();
            context.strokeStyle = 'rgb(204,204,204)';
            context.beginPath();
            context.moveTo(p1.get_x(),p1.get_y());
            context.lineTo(p2.get_x(),p2.get_y());
            context.stroke();
        }

        currentTest.draw();
        
    context.restore();

}

function updateStats() {
    if ( ! showStats )
        return;
    var currentViewCenterWorld = getWorldPointFromPixelPoint( viewCenterPixel );
    var fbSpan = document.getElementById('feedbackSpan');
    fbSpan.innerHTML =
        "Status: "+(run?'running':'paused') +
        "<br>Physics step time (average of last 60 steps): "+myRound(frameTime60,2)+"ms" +
        //"<br>Mouse down: "+mouseDown +
        "<br>PTM: "+myRound(PTM,2) +
        "<br>View center: "+myRound(currentViewCenterWorld.x,3)+", "+myRound(currentViewCenterWorld.y,3) +
        //"<br>Canvas offset: "+myRound(canvasOffset.x,0)+", "+myRound(canvasOffset.y,0) +
        "<br>Mouse pos (pixel): "+mousePosPixel.x+", "+mousePosPixel.y +
        "<br>Mouse pos (world): "+myRound(mousePosWorld.x,3)+", "+myRound(mousePosWorld.y,3);
}

window.requestAnimFrame = (function(){
    return  window.requestAnimationFrame       || 
            window.webkitRequestAnimationFrame || 
            window.mozRequestAnimationFrame    || 
            window.oRequestAnimationFrame      || 
            window.msRequestAnimationFrame     || 
            function( callback ){
              window.setTimeout(callback, 1000 / 60);
            };
})();

function animate() {
    if ( run )
        requestAnimFrame( animate );
    step();
}

function pause() {
    run = !run;
    if (run)
        animate();
    updateStats();
}