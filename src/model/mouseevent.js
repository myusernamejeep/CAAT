/**
 * @author  Hyperandroid  ||  http://hyperandroid.com/
 *
 * MouseEvent is a class to hold necessary information of every mouse event related to concrete
 * scene graph Actors.
 *
 * Here it is also the logic to on mouse events, pump the correct event to the appropiate scene
 * graph Actor.
 *
 * 20101008 Hyperandroid. changed event scope from CAAT.director.canvas to window. Works under
 *          al major browsers on linux and win7. Thanks @alteredq for this tip.
 *
 * TODO: add events for event pumping:
 *  + cancelBubling
 *
 **/
(function() {
	CAAT.MouseEvent = function() {
		this.point= new CAAT.Point();
		this.screenPoint= new CAAT.Point();
		return this;
	};
	
	CAAT.MouseEvent.prototype= {
		screenPoint:	null,
		point:			null,
		modifiers:		0,
		time:			0,
		source:			null,
		
		SHIFT:			16,
		CONTROL:		17,
		ALT:			18,

		SHIFT_MASK:		1,
		CONTROL_MASK:	2,
		ALT_MASK:		4,
		
		init : function( x,y,modifiers,source,screenPoint ) {
			this.point.set(x,y);
			this.modifiers= modifiers;
			this.source= source;
			this.screenPoint= screenPoint;
			return this;
		},
		isAltDown : function() {
			return this.modifiers&this.ALT_MASK;
		},
		isControlDown : function() {
			return this.modifiers&this.CONTROL_MASK;
		},
		isShiftDown : function() {
			return this.modifiers&this.SHIFT_MASK;
		}
	};
})();

/**
 * Flag to signal whether events are enabled for CAAT.
 */
CAAT.GlobalEventsEnabled=   false;

/**
 * Global event function listeners.
 */
CAAT.keyDownFunc=           null;
CAAT.keyUpFunc=             null;
CAAT.mouseDownFunc=         null;
CAAT.mouseUpFunc=           null;
CAAT.mouseOverFunc=         null;
CAAT.mouseOutFunc=          null;
CAAT.mouseMoveFunc=         null;
CAAT.dblClickFunc=          null;

/**
 * Generic eventing attributes.
 */
CAAT.lastSelectedActor=     null;
CAAT.mousePoint=            null;
CAAT.prevMousePoint=        null;
CAAT.screenMousePoint=      null;
CAAT.mouseDown=             false;
CAAT.modifiers=             0;
CAAT.dragging=              false;
CAAT.targetDirector=        null;

/**
 * Do not consider mouse drag gesture at least until you have dragged
 *
 */
CAAT.DRAG_THRESHOLD_X=      5;
CAAT.DRAG_THRESHOLD_Y=      5;

/**
 * Allow visual debugging artifacts.
 */
CAAT.DEBUG=                 false;

CAAT.getCanvasCoord= function __getCanvasCoord(point, e) {
	var posx = 0;
	var posy = 0;
	if (!e) e = window.event;
	if (e.pageX || e.pageY) 	{
		posx = e.pageX;
		posy = e.pageY;
	}
	else if (e.clientX || e.clientY) 	{
		posx = e.clientX + document.body.scrollLeft
			+ document.documentElement.scrollLeft;
		posy = e.clientY + document.body.scrollTop
			+ document.documentElement.scrollTop;
	}

    var pposx;
    var pposy;
    var i;

    for( i=0; i<CAAT.director.length; i++ ) {
        pposx= posx;
        pposy= posy;

    	pposx-= CAAT.director[i].canvas.offsetLeft;
    	pposy-= CAAT.director[i].canvas.offsetTop;

        if ( CAAT.director[i].contains(pposx, pposy) ) {
            CAAT.targetDirector= CAAT.director[i];
            point.set(pposx,pposy);
            CAAT.screenMousePoint.set(pposx, pposy);
            return;
        }
    }

    CAAT.targetDirector=null;
};

CAAT.log= function(msg) {
    if (console) {
        console.log(msg);
    }
};

CAAT.GlobalDisableEvents= function __GlobalDisableEvents()
{
    CAAT.log("(CAAT.MouseEvent) Disabling CAAT event capture");

    window.removeEventListener('keydown',   CAAT.keyDownFunc);
    window.removeEventListener('keyup',     CAAT.keyUpFunc);
    window.removeEventListener('mousedown', CAAT.mouseDownFunc);
    window.removeEventListener('mouseup',   CAAT.mouseUpFunc);
    window.removeEventListener('mousemove', CAAT.mouseMoveFunc);
    window.removeEventListener('mouseover', CAAT.mouseOverFunc);
    window.removeEventListener('mouseout',  CAAT.mouseOutFunc);
    window.removeEventListener('dblclick',  CAAT.dblClickFunc);

    CAAT.GlobalEventsEnabled= false;
};

CAAT.GlobalEnableEvents= function __GlobalEnableEvents() {

    if (CAAT.GlobalEventsEnabled) {
        return;
    }

    CAAT.log("(CAAT.MouseEvent) Enabling CAAT event capture")

    CAAT.mousePoint=      new CAAT.Point();
    CAAT.prevMousePoint=     new CAAT.Point();
    CAAT.screenMousePoint=   new CAAT.Point();

    window.addEventListener('keydown',
        CAAT.keyDownFunc= function(evt,c) {
            var key = (evt.which) ? evt.which : event.keyCode;
            switch( key ) {
            case CAAT.MouseEvent.prototype.SHIFT:
                CAAT.modifiers|=CAAT.MouseEvent.prototype.SHIFT_MASK;
                break;
            case CAAT.MouseEvent.prototype.CONTROL:
                CAAT.modifiers|=CAAT.MouseEvent.prototype.CONTROL_MASK;
                break;
            case CAAT.MouseEvent.prototype.ALT:
                CAAT.modifiers|=CAAT.MouseEvent.prototype.ALT_MASK;
                break;
            }
        },
        false);

    window.addEventListener('keyup',
        CAAT.keyUpFunc= function(evt,c) {
            var key = (evt.which) ? evt.which : event.keyCode;
            switch( key ) {
            case CAAT.MouseEvent.prototype.SHIFT:
                CAAT.modifiers&=~CAAT.MouseEvent.prototype.SHIFT_MASK;
                break;
            case CAAT.MouseEvent.prototype.CONTROL:
                CAAT.modifiers&=~CAAT.MouseEvent.prototype.CONTROL_MASK;
                break;
            case CAAT.MouseEvent.prototype.ALT:
                CAAT.modifiers&=~CAAT.MouseEvent.prototype.ALT_MASK;
                break;
            case 68:    // D
                if ( CAAT.DEBUG ) {
                    if ( null!=CAAT.targetDirector ) {
                        CAAT.targetDirector.debug= !CAAT.targetDirector.debug;
                    }
                }
                break;
            }
        },
        false );


    window.addEventListener('mouseup',
            CAAT.mouseUpFunc= function(e) {
                CAAT.mouseDown = false;
                if (null != CAAT.lastSelectedActor) {
                    CAAT.lastSelectedActor.mouseUp(
                            new CAAT.MouseEvent().init(
                                    CAAT.lastSelectedActor.rpoint.x,
                                    CAAT.lastSelectedActor.rpoint.y,
                                    CAAT.modifiers,
                                    CAAT.lastSelectedActor,
                                    CAAT.screenMousePoint));
                }

                if (!CAAT.dragging) {
                    if (null != CAAT.lastSelectedActor) {
                        CAAT.lastSelectedActor.mouseClick(
                                new CAAT.MouseEvent().init(
                                        CAAT.lastSelectedActor.rpoint.x,
                                        CAAT.lastSelectedActor.rpoint.y,
                                        CAAT.modifiers,
                                        CAAT.lastSelectedActor,
                                        CAAT.screenMousePoint));
                    }
                } else {
                    CAAT.dragging = false;
                }
            },
            false);

    window.addEventListener('mousedown',
            CAAT.mouseDownFunc= function(e) {

                CAAT.getCanvasCoord(CAAT.mousePoint, e);

                if ( null==CAAT.targetDirector ) {
                    return;
                }
                CAAT.mouseDown = true;
                CAAT.lastSelectedActor = CAAT.targetDirector.findActorAtPosition(CAAT.mousePoint);
                var px= CAAT.mousePoint.x;
                var py= CAAT.mousePoint.y;
                
                if (null != CAAT.lastSelectedActor) {
                    // to calculate mouse drag threshold
                    CAAT.prevMousePoint.x= px;
                    CAAT.prevMousePoint.y= py;
                    CAAT.lastSelectedActor.mouseDown(
                            new CAAT.MouseEvent().init(
                                    CAAT.lastSelectedActor.rpoint.x,
                                    CAAT.lastSelectedActor.rpoint.y,
                                    CAAT.modifiers,
                                    CAAT.lastSelectedActor,
                                    CAAT.screenMousePoint));
                }
            },
            false);

    window.addEventListener('mouseover',
            CAAT.mouseOverFunc= function(e) {
                CAAT.getCanvasCoord(CAAT.mousePoint, e);

                if ( null==CAAT.targetDirector ) {
                    return;
                }

                CAAT.lastSelectedActor = CAAT.targetDirector.findActorAtPosition(CAAT.mousePoint);
                if (null != CAAT.lastSelectedActor) {
                    CAAT.lastSelectedActor.mouseEnter(
                            new CAAT.MouseEvent().init(
                                    CAAT.lastSelectedActor.rpoint.x,
                                    CAAT.lastSelectedActor.rpoint.y,
                                    CAAT.modifiers,
                                    CAAT.lastSelectedActor,
                                    CAAT.screenMousePoint));
                }
            },
            false);

    window.addEventListener('mouseout',
            CAAT.mouseOutFunc= function(e) {
                if (null != CAAT.lastSelectedActor) {
                    CAAT.lastSelectedActor.mouseExit(new CAAT.MouseEvent().init(0, 0, CAAT.modifiers, CAAT.lastSelectedActor, CAAT.screenMousePoint));
                    CAAT.lastSelectedActor = null;
                }
                CAAT.mouseDown = false;
            },
            false);

    window.addEventListener('mousemove',
            CAAT.mouseMoveFunc= function(e) {

                CAAT.getCanvasCoord(CAAT.mousePoint, e);
                if ( null==CAAT.targetDirector ) {
                    return;
                }

                // drag
                if (CAAT.mouseDown && null != CAAT.lastSelectedActor) {

                    // check for mouse move threshold.
                    if ( !CAAT.dragging ) {
                        if ( Math.abs(CAAT.prevMousePoint.x-CAAT.mousePoint.x)< CAAT.DRAG_THRESHOLD_X &&
                             Math.abs(CAAT.prevMousePoint.y-CAAT.mousePoint.y)< CAAT.DRAG_THRESHOLD_Y ) {
                            return;
                        }
                    }

                    CAAT.dragging = true;
                    if (null != CAAT.lastSelectedActor.parent) {
                        CAAT.lastSelectedActor.parent.inverseTransformCoord(CAAT.mousePoint);
                    }
                    CAAT.lastSelectedActor.mouseDrag(
                            new CAAT.MouseEvent().init(
                                    CAAT.mousePoint.x,
                                    CAAT.mousePoint.y,
                                    CAAT.modifiers,
                                    CAAT.lastSelectedActor,
                                    CAAT.screenMousePoint));
                    return;
                }

                var lactor = CAAT.targetDirector.findActorAtPosition(CAAT.mousePoint);

                // cambiamos de actor.
                if (lactor != CAAT.lastSelectedActor) {
                    if (null != CAAT.lastSelectedActor) {
                        CAAT.lastSelectedActor.mouseExit(
                                new CAAT.MouseEvent().init(
                                        CAAT.mousePoint.x,
                                        CAAT.mousePoint.y,
                                        CAAT.modifiers,
                                        CAAT.lastSelectedActor,
                                        CAAT.screenMousePoint));
                    }
                    if (null != lactor) {
                        lactor.mouseEnter(
                                new CAAT.MouseEvent().init(
                                        lactor.rpoint.x,
                                        lactor.rpoint.y,
                                        CAAT.modifiers,
                                        lactor,
                                        CAAT.screenMousePoint));
                    }
                }
                CAAT.lastSelectedActor = lactor;
                if (null != lactor) {
                    CAAT.lastSelectedActor.mouseMove(
                            new CAAT.MouseEvent().init(
                                    CAAT.lastSelectedActor.rpoint.x,
                                    CAAT.lastSelectedActor.rpoint.y,
                                    CAAT.modifiers,
                                    CAAT.lastSelectedActor,
                                    CAAT.screenMousePoint));
                }
            },
            false);

    window.addEventListener("dblclick",
            CAAT.dblClickFunc= function(e) {
                CAAT.getCanvasCoord(CAAT.mousePoint, e);
                if (null != CAAT.lastSelectedActor) {
                    CAAT.lastSelectedActor.mouseDblClick(
                            new CAAT.MouseEvent().init(
                                    CAAT.lastSelectedActor.rpoint.x,
                                    CAAT.lastSelectedActor.rpoint.y,
                                    CAAT.modifiers,
                                    CAAT.lastSelectedActor,
                                    CAAT.screenMousePoint));
                }
            },
            false);
};