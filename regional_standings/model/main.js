"use strict";

const Ranking = require('./ranking');
const RegionList = ['Europe']//, 'Americas', 'Asia'];

function run()
{
    let regions = [0,1,2];
    if ( process.argv[2] !== undefined )
        regions = JSON.parse(process.argv[2]);

    // Parse matches and generate standings
    let [matches,teams] = Ranking.generateRanking( );

    // Get date of most recent match
    let mostRecentMatch = Math.max( ...matches.map( m => m.matchStartTime ) );

    // format date as YYYY-MM-DD
    let d = new Date( 0 );
    d.setUTCSeconds( mostRecentMatch );
    let strDate = d.toLocaleString( 'fr-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'America/Los_Angeles' } );

    // Get the region we are doing standings for
    let standings = 'Standings';
    if( regions.length === 1 )
    {
        standings = `Regional Standings for ${RegionList[regions[0]]}`;
    }

    // Print markdown table for results
    console.log( `### ${standings} as of ${strDate}` );
    console.log( '' );
    Ranking.displayRankings( teams, regions, 20 );
    console.log( '' );
    console.log( '_Event data for Regional Standings provided by HLTV.org_' );

    // Print markdown table for event contribution of best team.
    // let team = teams[1];
    // console.log( `### Event contribution as of ${strDate} for ${team.name}` );
    // console.log( '' );
    // Ranking.displayEventContribution( team );

    // // Print markdown table for match contribution of best team.
    // console.log( `### Match contribution as of ${strDate} for ${team.name}` );
    // console.log( '' );
    // Ranking.displayWonMatchContribution( team, 10 );
}

run();

