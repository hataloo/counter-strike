"use strict";

module.exports = {
    generateRanking: generateRanking,
    displayRankings: displayRankings,
    displayEventContribution: displayEventContribution,
    displayWonMatchContribution: displayWonMatchContribution,
}

const RankingContext = require('./ranking_context');
const DataLoader = require('./data_loader');
const Glicko = require('./glicko');
const Table = require('./table');
const remapValueClamped = require('./util/remap_value_clamped');

const SEED_MODIFIER_FACTORS = {
    bountyCollected: 1,
    bountyOffered: 1,
    opponentNetwork: 1,
    ownNetwork: 0,
    lanFactor: .5
};
const MIN_SEEDED_RANK = 400;
const MAX_SEEDED_RANK = 1000;

function generateRanking( versionTimestamp = -1)
{
    // Parameters
    const rankingContext = new RankingContext;
    rankingContext.setHveMod(1).setOutlierCount(5);

    const dataLoader = new DataLoader( rankingContext );
    dataLoader.loadData( versionTimestamp );

    let teams = dataLoader.teams;
    let matches = dataLoader.matches;

    const glicko = new Glicko();
    glicko.setFixedRD( 75 );        // glicko -> elo

    // Apply seeding
    seedTeams( glicko, teams );

    // Adjust rankings based on games played
    runMatches( glicko, matches );
    teams.forEach( team => { team.rankValue = team.glickoTeam.rank(); } );

    // Remove rosters with no wins from the standings
    teams = teams.filter( t => t.distinctTeamsDefeated > 0 );

    return [matches,teams];
}

function displayRankings( teams, regions = [0,1,2], maxTeams = -1) {
    var table = new Table();

    // Sort teams by rank value
    let sortedTeams = [...teams].sort((a, b) => b.rankValue - a.rankValue);

    table.addNumericColumn( 'Standing' );
    table.addColumn( 'Team Name' ).setMinWidth(12);
    table.addNumericColumn( 'Col').setPrecision(0).setMaxWidth(7);
    table.addNumericColumn( 'Off').setPrecision(0).setMaxWidth(7);
    table.addNumericColumn( 'Opp').setPrecision(0).setMaxWidth(7);
    // table.addNumericColumn( 'OwnNet').setPrecision(2).setMaxWidth(7);
    table.addNumericColumn( 'LAN').setPrecision(0).setMaxWidth(7);
    // table.addNumericColumn( 'Seed').setPrecision(2).setMaxWidth(7);
    table.addNumericColumn( 'Init').setPrecision(0).setMaxWidth(5);
    table.addNumericColumn( '+-').setPrecision(0).setMaxWidth(5);
    table.addNumericColumn( 'Points' ).setPrecision(0);
    // table.addColumn( 'Roster' );

    var dispRank = 0;
    sortedTeams.forEach((t, idx) => {
		if (t.matchesPlayed >= 5 && regions.some(r => r === t.region) && (maxTeams == -1 || idx < maxTeams)) {

			dispRank += 1;
            table.addElem( dispRank );
            table.addElem( t.name );
            table.addElem( t.rankValueContributions.bountyCollected );
            table.addElem( t.rankValueContributions.bountyOffered );
            table.addElem( t.rankValueContributions.opponentNetwork );
            // table.addElem( t.modifiers.ownNetwork );
            table.addElem( t.rankValueContributions.lanFactor );
            // table.addElem( t.seedValue );
            table.addElem( t.rankValueSeed );
            table.addElem( t.glickoTeam.rank() - t.rankValueSeed);
            table.addElem( t.glickoTeam.rank() );
            // table.addElem( t.players.map(p => p.nick).join(', ') );
            table.commitRow();
        }
    });

    table.printMarkdown();
}

function displayEventContribution( team ) {
    var table = new Table();

    table.addNumericColumn( 'Standing' );
    table.addColumn( 'Event Name' ).setMinWidth(12);
    let rawCol = table.addNumericColumn( 'Raw ($k)' ).setPrecision(1).setSummarySum();
    table.addNumericColumn( 'Disc.' ).setPrecision(3);
    let dwCol = table.addNumericColumn( 'D.w. ($k)' ).setPrecision(2).setSummarySum();
    let nwCol = table.addNumericColumn( 'Norm. win' ).setPrecision(2).setSummarySum();

    // Sort events by rank value
    let sortedEvents = [...team.scaledPrizeEventMap]
        .map(([eventID, eventWinnings]) => (eventWinnings))
        .sort((a, b) => b.discount - a.discount);
    let dispRank = 0;
    sortedEvents.forEach((eCont) => {
        dispRank += 1;
        table.addElem( dispRank );
        let teamEvent = eCont.teamEvent;
        let event = teamEvent.event;
        table.addElem( event.name );
        table.addElem( eCont.winnings / 1000 );
        table.addElem( eCont.discount);
        table.addElem( eCont.discountedWinnings / 1000);
        table.addElem( eCont.normalizedWinnings );

        table.commitRow();
    });
    // Add summary
    // table.addElem()
    table.printMarkdown();
}

function displayWonMatchContribution( team, maxMatches = -1 ) {
    var table = new Table();

    table.addNumericColumn( 'Standing' );
    table.addColumn( 'Event' ).setMaxWidth(12);
    table.addColumn( 'Opponent' ).setMaxWidth(12);
    table.addNumericColumn( 'BtyCol').setPrecision(3).setMaxWidth(7).setSummarySum();
    table.addNumericColumn( 'OppBty').setPrecision(3).setMaxWidth(7);
    table.addNumericColumn( 'PP ($k)').setPrecision(0).setMaxWidth(7);
    table.addNumericColumn( 'Stake' ).setPrecision(3).setMaxWidth(7);
    table.addNumericColumn( 'Time' ).setPrecision(3).setMaxWidth(7);
    table.addNumericColumn( 'Modi' ).setPrecision(3).setMaxWidth(7);

    // Sort matches by time.
    let sortedMatches = team.wonMatchContributions.sort(
        (a, b) => b.bounty - a.bounty
    );
    let dispRank = 0;
    sortedMatches.forEach((mCont) => {
        if (maxMatches != -1 && dispRank < maxMatches) {
            dispRank += 1;
            table.addElem( dispRank );
            let teamMatch = mCont.teamMatch;
            let opponent = teamMatch.opponent;
            let eventName = teamMatch.team.eventMap.get( teamMatch.match.eventId ).event.name;
            table.addElem( eventName );
            table.addElem( opponent.name )
            table.addElem( mCont.bounty );
            table.addElem( mCont.oppWinnings );
            table.addElem( mCont.prizepool / 1000 );
            table.addElem( mCont.stakesModifier );
            table.addElem( mCont.timestampModifier );
            table.addElem( mCont.matchModifier );
            table.commitRow();
        }
    });
    table.printMarkdown();
    console.log( team.opponentWinnings );
    console.log(
        team.wonMatchContributions.sort((a,b) => b.bounty - a.bounty).slice(0, 9).map( a => a.bounty).reduce( (a,b) => a + b, 0) / 10
    );
    
}

//--------------------------------------------------------------------------------------------------
//--------------------------------------------------------------------------------------------------
// Seeding Teams
function seedTeams( glicko, teams ) {
    teams.forEach(team => {
        team.seedValue = calculateSeedModifierValue( team.modifiers );
    } );

	// remap teams from current range to minRankValue..maxRankValue
    let minSeedValue = Math.min( ...teams.map(t => t.seedValue ) );
    let maxSeedValue = Math.max( ...teams.map(t => t.seedValue ) );

    let maxModifiers = {} 
    let minModifiers = {}
    let sumCoeff = 0;
    for ( let factor in SEED_MODIFIER_FACTORS ) {
        maxModifiers[factor] = Math.max( ...teams.map(t => t.modifiers[factor]))
        minModifiers[factor] = Math.min( ...teams.map(t => t.modifiers[factor]))
        sumCoeff += SEED_MODIFIER_FACTORS[factor];
    };
    console.log(maxModifiers)
    console.log(minModifiers)
    
    teams.forEach( team => {
        team.rankValue = remapValueClamped( team.seedValue, minSeedValue, maxSeedValue, MIN_SEEDED_RANK, MAX_SEEDED_RANK );

        // Rank value contribution per factor
        team.rankValueContributions = {}
        for ( let factor in SEED_MODIFIER_FACTORS ) {
            let modValue = SEED_MODIFIER_FACTORS[factor] * team.modifiers[factor];
            let contribution = modValue / (team.seedValue * sumCoeff);
            team.rankValueContributions[factor] = contribution * team.rankValue;
            // remapValueClamped( team.modifiers[factor], 
            //     minModifiers[factor], maxModifiers[factor], MIN_SEEDED_RANK, MAX_SEEDED_RANK ) 
        }

        // Save off original rank
        team.rankValueSeed = team.rankValue;

        // create glicko data
        team.glickoTeam = glicko.newTeam( team.rankValue );
    } );
}

function calculateSeedModifierValue( modifiers )
{
    let sumCoeff = 0;
    let scaledMods = 0;
    for( let factor in SEED_MODIFIER_FACTORS )
    {
        sumCoeff   += SEED_MODIFIER_FACTORS[factor];
        scaledMods += SEED_MODIFIER_FACTORS[factor] * modifiers[factor];
        modifiers[factor + 'ELO'] = remapValueClamped( SEED_MODIFIER_FACTORS[factor] * modifiers[factor], 0, SEED_MODIFIER_FACTORS[factor], MIN_SEEDED_RANK, MAX_SEEDED_RANK );
    }
    sumCoeff = sumCoeff === 0 ? 1 : sumCoeff;
    return scaledMods / sumCoeff;
}

//--------------------------------------------------------------------------------------------------
//--------------------------------------------------------------------------------------------------
// Adjusting Teams by Results
function runMatches( glicko, matches ) {
    //matches.reverse();
    matches.forEach( match => {
        let team1 = match.team1;
        let team2 = match.team2;

        let [winTeam, loseTeam] = ( match.winningTeam === 1) ? [team1,team2] : [team2,team1];
        glicko.singleMatch( winTeam.glickoTeam, loseTeam.glickoTeam, match.informationContent );
    } );
}

