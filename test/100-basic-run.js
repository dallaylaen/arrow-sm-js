
"use strict";
const chai = require('chai');
const should = chai.should();
const expect = chai.expect;

const ArrowSM = require( '../lib/arrow-sm.js' );

describe( 'ArrowSM', () => {
    it( 'can set up a state machine', done => {
        const sm = new ArrowSM({
            sleep: ev => { if (ev) return 'awake' },
            awake: ev => { if (ev === 'night') return 'sleep'; }
        });

        expect( () => sm.start('none') ).to.throw(/[Ii]llegal/);
        expect( () => sm.start() ).to.throw(/[Ii]llegal/);

        const sm1 = sm.start('sleep');
        const sm2 = sm.start('sleep');

        sm1.state.should.equal('sleep');
        sm2.state.should.equal('sleep');

        sm1('get up');

        sm1.state.should.equal('awake');
        sm2.state.should.equal('sleep');

        done();
    });
});

