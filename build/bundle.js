
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.head.appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    // TODO figure out if we still want to support
    // shorthand events, or if we want to implement
    // a real bubbling mechanism
    function bubble(component, event) {
        const callbacks = component.$$.callbacks[event.type];
        if (callbacks) {
            callbacks.slice().forEach(fn => fn(event));
        }
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(children(options.target));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.19.2' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/Space.svelte generated by Svelte v3.19.2 */

    const file = "src/Space.svelte";

    function create_fragment(ctx) {
    	let div;
    	let t;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t = text(/*space*/ ctx[0]);
    			attr_dev(div, "class", "player svelte-19ksopy");
    			toggle_class(div, "winner", /*won*/ ctx[1]);
    			add_location(div, file, 24, 0, 426);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t);
    			dispose = listen_dev(div, "click", /*click_handler*/ ctx[3], false, false, false);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*space*/ 1) set_data_dev(t, /*space*/ ctx[0]);

    			if (dirty & /*won*/ 2) {
    				toggle_class(div, "winner", /*won*/ ctx[1]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { space = "" } = $$props;
    	let { winner = "" } = $$props;
    	const writable_props = ["space", "winner"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Space> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Space", $$slots, []);

    	function click_handler(event) {
    		bubble($$self, event);
    	}

    	$$self.$set = $$props => {
    		if ("space" in $$props) $$invalidate(0, space = $$props.space);
    		if ("winner" in $$props) $$invalidate(2, winner = $$props.winner);
    	};

    	$$self.$capture_state = () => ({ space, winner, won });

    	$$self.$inject_state = $$props => {
    		if ("space" in $$props) $$invalidate(0, space = $$props.space);
    		if ("winner" in $$props) $$invalidate(2, winner = $$props.winner);
    		if ("won" in $$props) $$invalidate(1, won = $$props.won);
    	};

    	let won;

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*winner, space*/ 5) {
    			 $$invalidate(1, won = winner !== "" & space === winner);
    		}
    	};

    	return [space, won, winner, click_handler];
    }

    class Space extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { space: 0, winner: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Space",
    			options,
    			id: create_fragment.name
    		});
    	}

    	get space() {
    		throw new Error("<Space>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set space(value) {
    		throw new Error("<Space>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get winner() {
    		throw new Error("<Space>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set winner(value) {
    		throw new Error("<Space>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const subscriber_queue = [];
    /**
     * Creates a `Readable` store that allows reading by subscription.
     * @param value initial value
     * @param {StartStopNotifier}start start and stop notifications for subscriptions
     */
    function readable(value, start) {
        return {
            subscribe: writable(value, start).subscribe,
        };
    }
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    var gameStore = new readable(undefined, (set) => {
      const connection = new WebSocket({"env":{"url":"http://localhost:4001","webSocketUrlLocal":"ws://localhost:2222"}}.env.webSocketUrlLocal);
      connection.onopen = function() {
        console.log('connected');
      };
      connection.onmessage = (event) => {
        set(JSON.parse(event.data));
      };

      connection.onclose = (e) => {
        console.log(e, 'closed');
      };
    });

    const nextMove = async (space) => {
      try {
        const response = await fetch(`${{"env":{"url":"http://localhost:4001","webSocketUrlLocal":"ws://localhost:2222"}}.env.url}/next-turn/${space}`);
        const message = await response.json();
        return message.errorMessage;
      } catch (err) {
        console.log(err);
        return 'Error connecting to the server.';
      }
    };

    const resetGame = async () => {
      try {
        await fetch(`${{"env":{"url":"http://localhost:4001","webSocketUrlLocal":"ws://localhost:2222"}}.env.url}/reset`);
      } catch (e) {
        console.log(e);
      }
    };

    /* src/App.svelte generated by Svelte v3.19.2 */
    const file$1 = "src/App.svelte";

    // (59:2) {:else}
    function create_else_block(ctx) {
    	let h2;
    	let t0;
    	let t1;

    	const block = {
    		c: function create() {
    			h2 = element("h2");
    			t0 = text("Player ");
    			t1 = text(/*nextPlayer*/ ctx[1]);
    			add_location(h2, file$1, 59, 4, 1076);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h2, anchor);
    			append_dev(h2, t0);
    			append_dev(h2, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*nextPlayer*/ 2) set_data_dev(t1, /*nextPlayer*/ ctx[1]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(59:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (57:19) 
    function create_if_block_3(ctx) {
    	let h2;
    	let t0;
    	let t1;
    	let t2;

    	const block = {
    		c: function create() {
    			h2 = element("h2");
    			t0 = text("Player ");
    			t1 = text(/*winner*/ ctx[2]);
    			t2 = text(" won!!!");
    			add_location(h2, file$1, 57, 4, 1030);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h2, anchor);
    			append_dev(h2, t0);
    			append_dev(h2, t1);
    			append_dev(h2, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*winner*/ 4) set_data_dev(t1, /*winner*/ ctx[2]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(57:19) ",
    		ctx
    	});

    	return block;
    }

    // (55:2) {#if winner == 'TIE'}
    function create_if_block_2(ctx) {
    	let h2;

    	const block = {
    		c: function create() {
    			h2 = element("h2");
    			h2.textContent = "Tie Game!!!";
    			add_location(h2, file$1, 55, 4, 985);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h2, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(55:2) {#if winner == 'TIE'}",
    		ctx
    	});

    	return block;
    }

    // (79:2) {#if winner}
    function create_if_block_1(ctx) {
    	let button;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = "New Game";
    			attr_dev(button, "class", "svelte-1hql8qn");
    			add_location(button, file$1, 79, 4, 1851);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			dispose = listen_dev(button, "click", reset, false, false, false);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(79:2) {#if winner}",
    		ctx
    	});

    	return block;
    }

    // (82:2) {#if errorMessage}
    function create_if_block(ctx) {
    	let p;
    	let t;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t = text(/*errorMessage*/ ctx[3]);
    			attr_dev(p, "class", "errorMessage svelte-1hql8qn");
    			add_location(p, file$1, 82, 4, 1927);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*errorMessage*/ 8) set_data_dev(t, /*errorMessage*/ ctx[3]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(82:2) {#if errorMessage}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let main;
    	let h1;
    	let t1;
    	let t2;
    	let div0;
    	let t3;
    	let t4;
    	let t5;
    	let div1;
    	let t6;
    	let t7;
    	let t8;
    	let div2;
    	let t9;
    	let t10;
    	let t11;
    	let t12;
    	let current;

    	function select_block_type(ctx, dirty) {
    		if (/*winner*/ ctx[2] == "TIE") return create_if_block_2;
    		if (/*winner*/ ctx[2]) return create_if_block_3;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block0 = current_block_type(ctx);

    	const space0 = new Space({
    			props: {
    				winner: /*winner*/ ctx[2],
    				space: /*board*/ ctx[0][0]
    			},
    			$$inline: true
    		});

    	space0.$on("click", /*click_handler*/ ctx[5]);

    	const space1 = new Space({
    			props: {
    				winner: /*winner*/ ctx[2],
    				space: /*board*/ ctx[0][1]
    			},
    			$$inline: true
    		});

    	space1.$on("click", /*click_handler_1*/ ctx[6]);

    	const space2 = new Space({
    			props: {
    				winner: /*winner*/ ctx[2],
    				space: /*board*/ ctx[0][2]
    			},
    			$$inline: true
    		});

    	space2.$on("click", /*click_handler_2*/ ctx[7]);

    	const space3 = new Space({
    			props: {
    				winner: /*winner*/ ctx[2],
    				space: /*board*/ ctx[0][3]
    			},
    			$$inline: true
    		});

    	space3.$on("click", /*click_handler_3*/ ctx[8]);

    	const space4 = new Space({
    			props: {
    				winner: /*winner*/ ctx[2],
    				space: /*board*/ ctx[0][4]
    			},
    			$$inline: true
    		});

    	space4.$on("click", /*click_handler_4*/ ctx[9]);

    	const space5 = new Space({
    			props: {
    				winner: /*winner*/ ctx[2],
    				space: /*board*/ ctx[0][5]
    			},
    			$$inline: true
    		});

    	space5.$on("click", /*click_handler_5*/ ctx[10]);

    	const space6 = new Space({
    			props: {
    				winner: /*winner*/ ctx[2],
    				space: /*board*/ ctx[0][6]
    			},
    			$$inline: true
    		});

    	space6.$on("click", /*click_handler_6*/ ctx[11]);

    	const space7 = new Space({
    			props: {
    				winner: /*winner*/ ctx[2],
    				space: /*board*/ ctx[0][7]
    			},
    			$$inline: true
    		});

    	space7.$on("click", /*click_handler_7*/ ctx[12]);

    	const space8 = new Space({
    			props: {
    				winner: /*winner*/ ctx[2],
    				space: /*board*/ ctx[0][8]
    			},
    			$$inline: true
    		});

    	space8.$on("click", /*click_handler_8*/ ctx[13]);
    	let if_block1 = /*winner*/ ctx[2] && create_if_block_1(ctx);
    	let if_block2 = /*errorMessage*/ ctx[3] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			main = element("main");
    			h1 = element("h1");
    			h1.textContent = "Tic Tac Toe";
    			t1 = space();
    			if_block0.c();
    			t2 = space();
    			div0 = element("div");
    			create_component(space0.$$.fragment);
    			t3 = space();
    			create_component(space1.$$.fragment);
    			t4 = space();
    			create_component(space2.$$.fragment);
    			t5 = space();
    			div1 = element("div");
    			create_component(space3.$$.fragment);
    			t6 = space();
    			create_component(space4.$$.fragment);
    			t7 = space();
    			create_component(space5.$$.fragment);
    			t8 = space();
    			div2 = element("div");
    			create_component(space6.$$.fragment);
    			t9 = space();
    			create_component(space7.$$.fragment);
    			t10 = space();
    			create_component(space8.$$.fragment);
    			t11 = space();
    			if (if_block1) if_block1.c();
    			t12 = space();
    			if (if_block2) if_block2.c();
    			add_location(h1, file$1, 53, 2, 936);
    			attr_dev(div0, "class", "row svelte-1hql8qn");
    			add_location(div0, file$1, 61, 2, 1115);
    			attr_dev(div1, "class", "row svelte-1hql8qn");
    			add_location(div1, file$1, 67, 2, 1355);
    			attr_dev(div2, "class", "row svelte-1hql8qn");
    			add_location(div2, file$1, 73, 2, 1595);
    			attr_dev(main, "class", "svelte-1hql8qn");
    			add_location(main, file$1, 52, 0, 927);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, h1);
    			append_dev(main, t1);
    			if_block0.m(main, null);
    			append_dev(main, t2);
    			append_dev(main, div0);
    			mount_component(space0, div0, null);
    			append_dev(div0, t3);
    			mount_component(space1, div0, null);
    			append_dev(div0, t4);
    			mount_component(space2, div0, null);
    			append_dev(main, t5);
    			append_dev(main, div1);
    			mount_component(space3, div1, null);
    			append_dev(div1, t6);
    			mount_component(space4, div1, null);
    			append_dev(div1, t7);
    			mount_component(space5, div1, null);
    			append_dev(main, t8);
    			append_dev(main, div2);
    			mount_component(space6, div2, null);
    			append_dev(div2, t9);
    			mount_component(space7, div2, null);
    			append_dev(div2, t10);
    			mount_component(space8, div2, null);
    			append_dev(main, t11);
    			if (if_block1) if_block1.m(main, null);
    			append_dev(main, t12);
    			if (if_block2) if_block2.m(main, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block0) {
    				if_block0.p(ctx, dirty);
    			} else {
    				if_block0.d(1);
    				if_block0 = current_block_type(ctx);

    				if (if_block0) {
    					if_block0.c();
    					if_block0.m(main, t2);
    				}
    			}

    			const space0_changes = {};
    			if (dirty & /*winner*/ 4) space0_changes.winner = /*winner*/ ctx[2];
    			if (dirty & /*board*/ 1) space0_changes.space = /*board*/ ctx[0][0];
    			space0.$set(space0_changes);
    			const space1_changes = {};
    			if (dirty & /*winner*/ 4) space1_changes.winner = /*winner*/ ctx[2];
    			if (dirty & /*board*/ 1) space1_changes.space = /*board*/ ctx[0][1];
    			space1.$set(space1_changes);
    			const space2_changes = {};
    			if (dirty & /*winner*/ 4) space2_changes.winner = /*winner*/ ctx[2];
    			if (dirty & /*board*/ 1) space2_changes.space = /*board*/ ctx[0][2];
    			space2.$set(space2_changes);
    			const space3_changes = {};
    			if (dirty & /*winner*/ 4) space3_changes.winner = /*winner*/ ctx[2];
    			if (dirty & /*board*/ 1) space3_changes.space = /*board*/ ctx[0][3];
    			space3.$set(space3_changes);
    			const space4_changes = {};
    			if (dirty & /*winner*/ 4) space4_changes.winner = /*winner*/ ctx[2];
    			if (dirty & /*board*/ 1) space4_changes.space = /*board*/ ctx[0][4];
    			space4.$set(space4_changes);
    			const space5_changes = {};
    			if (dirty & /*winner*/ 4) space5_changes.winner = /*winner*/ ctx[2];
    			if (dirty & /*board*/ 1) space5_changes.space = /*board*/ ctx[0][5];
    			space5.$set(space5_changes);
    			const space6_changes = {};
    			if (dirty & /*winner*/ 4) space6_changes.winner = /*winner*/ ctx[2];
    			if (dirty & /*board*/ 1) space6_changes.space = /*board*/ ctx[0][6];
    			space6.$set(space6_changes);
    			const space7_changes = {};
    			if (dirty & /*winner*/ 4) space7_changes.winner = /*winner*/ ctx[2];
    			if (dirty & /*board*/ 1) space7_changes.space = /*board*/ ctx[0][7];
    			space7.$set(space7_changes);
    			const space8_changes = {};
    			if (dirty & /*winner*/ 4) space8_changes.winner = /*winner*/ ctx[2];
    			if (dirty & /*board*/ 1) space8_changes.space = /*board*/ ctx[0][8];
    			space8.$set(space8_changes);

    			if (/*winner*/ ctx[2]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_1(ctx);
    					if_block1.c();
    					if_block1.m(main, t12);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (/*errorMessage*/ ctx[3]) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);
    				} else {
    					if_block2 = create_if_block(ctx);
    					if_block2.c();
    					if_block2.m(main, null);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(space0.$$.fragment, local);
    			transition_in(space1.$$.fragment, local);
    			transition_in(space2.$$.fragment, local);
    			transition_in(space3.$$.fragment, local);
    			transition_in(space4.$$.fragment, local);
    			transition_in(space5.$$.fragment, local);
    			transition_in(space6.$$.fragment, local);
    			transition_in(space7.$$.fragment, local);
    			transition_in(space8.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(space0.$$.fragment, local);
    			transition_out(space1.$$.fragment, local);
    			transition_out(space2.$$.fragment, local);
    			transition_out(space3.$$.fragment, local);
    			transition_out(space4.$$.fragment, local);
    			transition_out(space5.$$.fragment, local);
    			transition_out(space6.$$.fragment, local);
    			transition_out(space7.$$.fragment, local);
    			transition_out(space8.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			if_block0.d();
    			destroy_component(space0);
    			destroy_component(space1);
    			destroy_component(space2);
    			destroy_component(space3);
    			destroy_component(space4);
    			destroy_component(space5);
    			destroy_component(space6);
    			destroy_component(space7);
    			destroy_component(space8);
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    async function reset() {
    	await resetGame();
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let board = ["", "", "", "", "", "", "", "", ""];
    	let nextPlayer;
    	let winner;

    	gameStore.subscribe(state => {
    		if (!state) {
    			return;
    		}

    		$$invalidate(0, { board, nextPlayer, winner, errorMessage } = state, board, $$invalidate(1, nextPlayer), $$invalidate(2, winner), $$invalidate(3, errorMessage));
    	});

    	let errorMessage = "";

    	async function takeSpace(space) {
    		if (winner) {
    			return;
    		}

    		$$invalidate(3, errorMessage = await nextMove(space));
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("App", $$slots, []);
    	const click_handler = () => takeSpace(0);
    	const click_handler_1 = () => takeSpace(1);
    	const click_handler_2 = () => takeSpace(2);
    	const click_handler_3 = () => takeSpace(3);
    	const click_handler_4 = () => takeSpace(4);
    	const click_handler_5 = () => takeSpace(5);
    	const click_handler_6 = () => takeSpace(6);
    	const click_handler_7 = () => takeSpace(7);
    	const click_handler_8 = () => takeSpace(8);

    	$$self.$capture_state = () => ({
    		Space,
    		gameStore,
    		nextMove,
    		resetGame,
    		board,
    		nextPlayer,
    		winner,
    		errorMessage,
    		takeSpace,
    		reset
    	});

    	$$self.$inject_state = $$props => {
    		if ("board" in $$props) $$invalidate(0, board = $$props.board);
    		if ("nextPlayer" in $$props) $$invalidate(1, nextPlayer = $$props.nextPlayer);
    		if ("winner" in $$props) $$invalidate(2, winner = $$props.winner);
    		if ("errorMessage" in $$props) $$invalidate(3, errorMessage = $$props.errorMessage);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		board,
    		nextPlayer,
    		winner,
    		errorMessage,
    		takeSpace,
    		click_handler,
    		click_handler_1,
    		click_handler_2,
    		click_handler_3,
    		click_handler_4,
    		click_handler_5,
    		click_handler_6,
    		click_handler_7,
    		click_handler_8
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    const app = new App({
      target: document.body
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
