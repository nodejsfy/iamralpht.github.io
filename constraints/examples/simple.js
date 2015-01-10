"use strict";

function makeTwitterPanelsExample(parentElement) {
    var context = new MotionContext();
    var solver = context.solver();

    var lastPanel = null;
    var panels = [];

    var MIN_GAP = 10;
    var PANEL_WIDTH = 250;

    for (var i = 0; i < 5; i++) {
        var p = new Box('Panel ' + (i+1));
        // Give these boxes "x" and "right" constraints.
        p.x = new c.Variable({ name: 'panel-' + i + '-x' });
        p.right = new c.Variable({ name: 'panel-' + i + '-right' });
        p.bottom = 170;
        // Make the panel 250 wide.
        solver.add(eq(p.right, c.plus(p.x, PANEL_WIDTH), medium));

        // Pin the first panel to 0, and add a motion constraint.
        if (i == 0) {
            solver.add(eq(p.x, 0, weak, 100));
            context.addMotionConstraint(new MotionConstraint(p.x, '==', 0));
        } else {
            // The panel mustn't reveal any space between it and the previous panel.
            solver.add(leq(p.x, panels[i-1].right, medium, 0));

            // Make the panel tend toward the left (zero). Use a lower priority than
            // the first panel so the solver will prefer for the first panel to be
            // zero than any of the additional panels.
            solver.add(eq(p.x, 0, weak, 0));

            // The panel must be to the right of the previous panel's left edge, plus 10.
            solver.add(geq(p.x, c.plus(panels[i-1].x, MIN_GAP), medium, 0));
        }
        panels.push(p);
        context.addBox(p);
        parentElement.appendChild(p.element());
        lastPanel = p;
    }

    // Make a manipulator. It takes touch events and updates a constrained variable
    // from them.

    var manip = new Manipulator(lastPanel.x, parentElement, 'x');
    context.addManipulator(manip);
}

makeTwitterPanelsExample(document.getElementById('twitter-panels-example'));

function makeScrollingExample(parentElement, bunching) {
    var parentHeight = parentElement.offsetHeight;
    var context = new MotionContext();
    var solver = context.solver();

    // This is the scroll position; it's the variable that the manipulator
    // changes.
    var scrollPosition = new c.Variable({name: 'scroll-position'});


    for (var i = 0; i < 10; i++) {
        var p = new Box('List Item ' + (i+1));
        // Use cassowary to layout the items in a column. Names are for debugging only.
        p.y = new c.Variable({ name: 'list-item-' + i + '-y' });
        p.bottom = new c.Variable({ name: 'list-item-' + i + '-bottom' });

        // Make items 300px wide.
        p.x = 5;
        p.right = 295;

        // If we're bunching and this is the first item then let it get bigger
        // and smaller...
        if (bunching && i == 0 && false) {
            solver.add(eq(p.y, 0, weak));
            solver.add(eq(p.bottom, scrollPosition, weak, 100));
            solver.add(geq(p.bottom, c.plus(p.y, 40), medium));
            solver.add(leq(p.bottom, c.plus(p.y, 80), medium));
        } else {
            // Make the items 40px tall.
            solver.add(eq(p.bottom, c.plus(p.y, 40), medium));
        }

        // Gap of 10 between items.
        if (i > 0)
            solver.add(eq(p.y, c.plus(scrollPosition, i*50), weak, 100));
        else
            solver.add(eq(p.y, scrollPosition, weak, 100));

        // Bunching. Don't let items go off of the top or bottom.
        if (bunching) {
            // XXX: We should express these bunches in terms of
            //      the previous card, rather than as absolute offsets (i*4).
            solver.add(geq(p.y, i*3, weak, 100));
            solver.add(leq(p.bottom, parentHeight + i * 3 - 9*3, weak, 100));
        }

        context.addBox(p);
        p.element().style.zIndex = 10 - i;
        parentElement.appendChild(p.element());
    }
    // Add some constraints to the first and last item. The first item can't move
    // past the top. The last item can't move up beyond the bottom. These are
    // motion constraints enforced by springs.


    var boxes = context.boxes();
    var firstBox = boxes[0];
    var lastBox = boxes[boxes.length - 1];
    // This prefers the list to be "scrolled" to the top.
    if (!bunching) solver.add(leq(firstBox.y, 0, weak));

    context.addMotionConstraint(
        new MotionConstraint(firstBox.y, '<=', 0, { physicsModel: MotionConstraint.criticallyDamped }));
    context.addMotionConstraint(
        new MotionConstraint(lastBox.bottom, '>=', parentHeight, { physicsModel: MotionConstraint.criticallyDamped }));

    var manip = new Manipulator(scrollPosition, parentElement, 'y');
    context.addManipulator(manip);
}

makeScrollingExample(document.getElementById('scrolling-example'));
makeScrollingExample(document.getElementById('android-notifications'), true);

function makeGravityExample(parentElement) {
    var context = new MotionContext();
    var solver = context.solver();

    var parentHeight = parentElement.offsetHeight;

    var b = new Box('Heavy Box');
    b.y = new c.Variable({name: 'box-y'});
    b.bottom = new c.Variable({name: 'box-bottom'});
    b.x = 0; 
    b.right = 300;
    
    context.addBox(b);

    parentElement.appendChild(b.element());

    solver.add(leq(b.bottom, parentHeight, weak));
    solver.add(eq(b.y, c.plus(b.bottom, -50), medium));

    context.addMotionConstraint(new MotionConstraint(b.bottom, '<=', parentHeight, { captive: true }));

    var manip = new Manipulator(b.y, parentElement, 'y');
    manip.createMotion = function(x, v) {
        var motion = new Gravity(5000, 9999999);
        motion.set(x, v);
        return motion;
    }
    context.addManipulator(manip);
}
makeGravityExample(document.getElementById('gravity-example'));

function makeScalingExample(parentElement) {
    var parentHeight = 480;
    var parentWidth = 320;

    var context = new MotionContext();
    var solver = context.solver();

    var scale = new c.Variable({name: 'scale'});

    var box = new Box('');

    box.x = new c.Variable({name: 'x'});
    box.y = new c.Variable({name: 'y'});
    box.bottom = new c.Variable({name: 'bottom'});
    box.right = new c.Variable({name: 'right'});

    // Set these DOM layout properties on Box so that it'll use a CSS
    // transform to apply the scale.
    box.domWidth = parentWidth;
    box.domHeight = parentHeight;

    var width = c.minus(box.right, box.x);
    var height = c.minus(box.bottom, box.y);

    // The width and height are related: we must keep the aspect ratio.
    //
    //   width = height * aspect
    //
    var aspect = parentWidth / parentHeight;
    solver.add(eq(width, c.times(height, aspect), required));

    // The height is controlled by the scale.
    //
    //  height = scale * 480 (parentHeight)
    //
    solver.add(eq(height, c.times(scale, parentHeight), medium));

    // The bottom of the box is pinned to the bottom of the screen, like FB Paper.
    //
    //  bottom = 480 (parentHeight)
    //
    solver.add(eq(parentHeight, box.bottom, medium));

    // The box is centered horizontally.
    // 
    //  centerX := x + width/2
    //  centerX = 320/2 (parentWidth / 2)
    //
    var centerX = c.plus(box.x, c.times(width, 0.5));
    solver.add(eq(centerX, parentWidth/2, medium));

    // Make a variable for width so that we can create a motion constraint for it.
    // Motion constraints should probably be able to understand expressions, too...
    var widthV = new c.Variable({name: 'width'});
    solver.add(eq(widthV, width, required));
    solver.add(geq(width, 150, weak));

    // Motion constraints on scale. We express the constraints on other variables.
    // Use a physics model that doesn't overbounce.
    context.addMotionConstraint(new MotionConstraint(widthV, '>=', 150, { physicsModel: MotionConstraint.criticallyDamped }));
    context.addMotionConstraint(new MotionConstraint(box.y, '>=', 0, { physicsModel: MotionConstraint.criticallyDamped }));

    parentElement.appendChild(box.element());
    context.addBox(box);
    context.addManipulator(new Manipulator(box.y, parentElement, 'y'));
}
makeScalingExample(document.getElementById('scaling-example'));
