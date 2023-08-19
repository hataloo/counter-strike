# TODO:
1. In initializeSeedingModifiers, split modifier contribution by event for each team.
    1. Start with attributing prize pool.
2. Add displayEventContribution(team): Prints table of events for team with modifier contribution.
3. Keep track of ELO change for each event. Add to displayEventContribution.

# Introduction
On date X, Valve announced their intention of only permitting tournament organizers to use Valve's own ranking system for invites after Y. The announcement sparked considerable discussion within the CSGO community due to considerable differences between Valve and HLTV's latest rankings. After digging into the code for the ranking system, I will attempt to explain Valve's ranking system which will hopefully allow the community to provide more informed feedback to Valve. 

# High level explanation
The following factors are considered for each team: bounty collected (defeated opponents' prize money), bounty offered (earned prize money), teams defeated*, defeated opponents' victories (number of teams defeated by your beaten opponents) and lan wins.

Every team is given a score from 0 to 1 in each factor. The scores are added together to create an initial ELO rating. The ELO rating is then updated using a standard ELO system using historical matches.

# Factors
## Bounty offered
## Own network
## Bounty collected
## Opponent network
## LAN factor
## Mathematical details

# ELO system

# Match details

# Event modifiers

# Evaluation of the model

# My critiques with the system
* Does not distinguish between BOXs (BO1 == BO3). BO3 should be less random and thus result in larger ELO changes.
* Only counts wins, disregards number of rounds won, maps won, et.c.
* A team that swaps out 1 or 2 players does not lose ANY points. (double-check) Does not "inherit" points either.
* Prize money is *incredibly* generous towards smaller tournaments due to non-linear scaling. $100K in winnings is worth half as much as $1M. Similarly, $10K in winnings is worth a third of $1M (or two thirds of $100K).
* Bounty offered is *very* generous towards smaller tournaments due to non-linear scaling. Reference prize pool: $160K. Thus, $16K is worth half as much as $160K and $1.6K is worth a thirds of $160K (or two thirds of $100K). Prevents outliers from *large winnings* but enables significant outliers from *small winnings*.