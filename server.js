const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));


// ======================================================
// HJÆLP
// ======================================================

function makeId() {
    return (
        Date.now().toString(36) +
        Math.random().toString(36).slice(2)
    );
}

function card(
    name,
    type,
    icon,
    cost = "",
    power = "",
    toughness = ""
) {
    return {
        id: makeId(),
        name,
        type,
        icon,
        cost,
        power,
        toughness
    };
}

function creature(name, icon, cost, power, toughness, abilities = []) {
    return {
        ...card(name, "creature", icon, cost, power, toughness),
        abilities
    };
}

function spell(name, icon, cost, damage) {
    return {
        ...card(name, "spell", icon, cost),
        effect: "damage",
        damage
    };
}

function instantDamageSpell(name, icon, cost, damage) {
    return {
        ...spell(name, icon, cost, damage),
        speed: "instant"
    };
}

function pumpSpell(name, icon, cost, powerBonus, toughnessBonus) {
    return {
        ...card(name, "spell", icon, cost),
        effect: "pump",
        speed: "instant",
        powerBonus,
        toughnessBonus
    };
}

function counterSpell(name, icon, cost, counters = 1) {
    return {
        ...card(name, "spell", icon, cost),
        effect: "plus1_counter",
        speed: "instant",
        counters
    };
}

function exileSpell(name, icon, cost) {
    return {
        ...card(name, "spell", icon, cost),
        effect: "exile_creature",
        speed: "sorcery"
    };
}

function drawSpell(name, icon, cost, amount = 1) {
    return {
        ...card(name, "spell", icon, cost),
        effect: "draw_cards",
        speed: "sorcery",
        amount
    };
}

function discardSpell(name, icon, cost, amount = 1) {
    return {
        ...card(name, "spell", icon, cost),
        effect: "discard_cards",
        speed: "sorcery",
        amount
    };
}

function returnFromGraveyardSpell(name, icon, cost) {
    return {
        ...card(name, "spell", icon, cost),
        effect: "return_creature_from_graveyard",
        speed: "sorcery"
    };
}

function tokenSpell(name, icon, cost, tokenName, tokenIcon, count, power, toughness) {
    return {
        ...card(name, "spell", icon, cost),
        effect: "create_tokens",
        tokenName,
        tokenIcon,
        tokenCount: count,
        tokenPower: power,
        tokenToughness: toughness
    };
}

function aura(name, icon, cost, powerBonus, toughnessBonus) {
    return {
        ...card(name, "enchantment", icon, cost),
        subtype: "aura",
        effect: "aura_buff",
        powerBonus,
        toughnessBonus
    };
}

function artifact(name, icon, cost, effect = "", amount = 0) {
    return {
        ...card(name, "artifact", icon, cost),
        effect,
        amount
    };
}


// ======================================================
// SPILLERE
// ======================================================

// #61 / v6.6: Two finished 40-card test decks.
// Both decks use 14 lands so tests start from the same basic deck size/mana baseline.
function buildPlayer1Deck() {
    // FOREST FURY — 40 cards: 14 lands, 20 creatures, 6 support cards.
    return [
        ...Array.from({ length: 14 }, () => card("Forest", "land", "🌲")),
        ...Array.from({ length: 2 }, () => card("Wolf", "creature", "🐺", "G", 2, 2)),
        ...Array.from({ length: 2 }, () => card("Bear", "creature", "🐻", "1G", 2, 2)),
        creature("Troll", "🧌", "2G", 3, 3, ["trample"]),
        creature("Viper", "🐍", "G", 1, 1, ["deathtouch"]),
        creature("Sacred Stag", "🦌", "1G", 2, 2, ["lifelink"]),
        creature("Giant Spider", "🕷️", "2G", 2, 4, ["reach"]),
        creature("Guardian", "🛡️", "2G", 3, 3, ["vigilance"]),
        creature("Swiftcat", "🐆", "1G", 2, 2, ["haste"]),
        creature("Mystic Turtle", "🐢", "2G", 2, 4, ["hexproof"]),
        creature("Stone Golem", "🗿", "3G", 3, 3, ["indestructible"]),
        creature("Ward Sentinel", "🔮", "2G", 3, 3, ["ward_2"]),
        creature("White Knight", "⚪", "1G", 2, 2, ["protection_red"]),
        creature("Flash Fox", "🦊", "1G", 2, 2, ["flash"]),
        creature("Stone Wall", "🧱", "1G", 0, 5, ["defender"]),
        creature("Knight", "⚔️", "1G", 2, 2, ["first_strike"]),
        creature("Duelist", "🗡️", "2G", 2, 2, ["double_strike"]),
        { ...creature("Soul Warden", "🧚", "1G", 1, 2, []), triggeredAbility: { event: "another_creature_enters", effect: "gain_life", amount: 1, text: "Whenever another creature enters under your control, gain 1 life" } },
        { ...creature("Forest Sage", "🧙", "2G", 2, 2, []), etbAbility: { effect: "gain_life", amount: 3, text: "When Forest Sage enters the battlefield, gain 3 life" } },
        pumpSpell("Giant Growth", "🌿", "G", 3, 3),
        counterSpell("Strength Seed", "🌱", "G", 1),
        tokenSpell("Call of the Grove", "🍄", "2G", "Saproling", "🍄", 2, 1, 1),
        aura("Might of the Grove", "✨", "1G", 2, 2),
        { ...artifact("Emerald Idol", "💎", "2", "life_on_entry", 2), activatedAbility: { cost: "tap", effect: "gain_life", amount: 1, text: "Tap: Gain 1 life" } },
        drawSpell("Ancient Insight", "📚", "1G", 2)
    ];
}

function buildPlayer2Deck() {
    // BURNING LEGION — 40 cards: 14 lands, 19 creatures, 7 burn spells.
    return [
        ...Array.from({ length: 14 }, () => card("Mountain", "land", "🌋")),
        ...Array.from({ length: 4 }, () => card("Goblin", "creature", "👺", "R", 1, 1)),
        ...Array.from({ length: 3 }, () => card("Orc", "creature", "👹", "1R", 3, 2)),
        ...Array.from({ length: 3 }, () => card("Fire Elemental", "creature", "🔥", "2R", 3, 3)),
        ...Array.from({ length: 3 }, () => creature("Bat", "🦇", "1R", 2, 2, ["flying"])),
        ...Array.from({ length: 2 }, () => creature("Ogre Brute", "👺", "2R", 3, 3, ["menace"])),
        ...Array.from({ length: 2 }, () => card("Red Dragon", "creature", "🐲", "4RR", 5, 5)),
        ...Array.from({ length: 2 }, () => card("Minotaur", "creature", "🐂", "3R", 4, 3)),
        ...Array.from({ length: 4 }, () => instantDamageSpell("Shock", "⚡", "R", 2)),
        ...Array.from({ length: 3 }, () => spell("Fireball", "🔥", "1R", 3))
    ];
}

function createPlayerFromDeck(deck) {
    return {
        life: 20,
        hand: [],
        library: deck,
        lands: [], creatures: [], enchantments: [], artifacts: [], exile: [], graveyard: [],
        landPlayedThisTurn: false
    };
}

function createPlayer1() { return createPlayerFromDeck(buildPlayer1Deck()); }
function createPlayer2() { return createPlayerFromDeck(buildPlayer2Deck()); }

// #60 / v6.5: Deck selection before the opening hand.
function buildDeckById(deckId) {
    if (deckId === "forest_fury") return buildPlayer1Deck();
    if (deckId === "burning_legion") return buildPlayer2Deck();
    return null;
}

// #62 / v6.7: Central deck validation.
// Prototype rule set: exactly 40 cards, max 4 copies of each non-basic card.
// Forest and Mountain are basic lands and may appear in any quantity.
const DECK_RULES = { size: 40, maxCopies: 4, basicLands: new Set(["Forest", "Mountain"]) };

function validateDeck(deck) {
    const errors = [];
    if (!Array.isArray(deck)) return { valid: false, errors: ["Deck-data mangler."] };

    if (deck.length !== DECK_RULES.size) {
        errors.push(`Decket skal indeholde præcis ${DECK_RULES.size} kort (har ${deck.length}).`);
    }

    const counts = new Map();
    deck.forEach((cardData, index) => {
        if (!cardData || typeof cardData.name !== "string" || !cardData.name.trim()) {
            errors.push(`Kort #${index + 1} mangler et gyldigt navn.`);
            return;
        }
        if (typeof cardData.type !== "string" || !cardData.type.trim()) {
            errors.push(`${cardData.name} mangler en gyldig korttype.`);
        }
        counts.set(cardData.name, (counts.get(cardData.name) || 0) + 1);
    });

    for (const [name, count] of counts) {
        if (!DECK_RULES.basicLands.has(name) && count > DECK_RULES.maxCopies) {
            errors.push(`${name}: maks. ${DECK_RULES.maxCopies} kopier er tilladt (har ${count}).`);
        }
    }

    return { valid: errors.length === 0, errors };
}

function getDeckValidationState() {
    const result = {};
    for (const deckId of ["forest_fury", "burning_legion"]) {
        const deck = buildDeckById(deckId);
        result[deckId] = validateDeck(deck);
    }
    return result;
}

function createEmptyPlayer() {
    return createPlayerFromDeck([]);
}

function startGameFromSelectedDecks() {
    const deck1 = buildDeckById(game.selectedDecks[1]);
    const deck2 = buildDeckById(game.selectedDecks[2]);
    if (!deck1 || !deck2) return false;
    if (!validateDeck(deck1).valid || !validateDeck(deck2).valid) return false;

    game.players[1] = createPlayerFromDeck(deck1);
    game.players[2] = createPlayerFromDeck(deck2);
    shuffleDeck(game.players[1].library);
    shuffleDeck(game.players[2].library);
    [1, 2].forEach(playerNumber => {
        const player = game.players[playerNumber];
        player.hand = player.library.splice(0, 7);
    });
    game.phase = "opening_hand";
    game.turnStep = "opening_hand";
    game.currentPlayer = 1;
    game.priorityPlayer = 1;
    return true;
}

// #38 / v4.2: Fisher-Yates shuffle. Each new game gets a freshly shuffled library.
function shuffleDeck(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

function dealOpeningHand(playerNumber, amount = 7) {
    for (let i = 0; i < amount; i++) drawCard(playerNumber);
}

function createNewGame() {
    return {
        currentPlayer: 1, turnNumber: 1, phase: "deck_selection", turnStep: "deck_selection", firstTurn: true,
        selectedDecks: { 1: null, 2: null },
        openingHandReady: { 1: false, 2: false },
        mulliganCount: { 1: 0, 2: 0 },
        pendingMulliganBottom: { 1: 0, 2: 0 },
        stack: [], priorityPlayer: 1, consecutivePasses: 0, pendingDiscard: null, pendingPriorityTransition: null,
        gameOver: false, winner: null, loser: null, gameOverReason: null, libraryDrawFailed: null,
        combat: { attackerIds: [], blockers: {} },
        players: { 1: createEmptyPlayer(), 2: createEmptyPlayer() }
    };
}

let game = createNewGame();

// ======================================================
// MANA
// ======================================================

function getManaColor(land) {
    if (land.name === "Forest") return "G";
    if (land.name === "Mountain") return "R";
    return null;
}

function parseCost(cost) {
    const numberMatch =
        cost.match(/\d+/);

    return {
        generic:
            numberMatch
                ? parseInt(numberMatch[0])
                : 0,

        green:
            (cost.match(/G/g) || []).length,

        red:
            (cost.match(/R/g) || []).length
    };
}

function findLandsToPay(
    playerNumber,
    cost
) {
    const available =
        game.players[playerNumber]
            .lands
            .filter(
                land => !land.tapped
            );

    const parsed =
        parseCost(cost);

    const selected = [];


    for (
        let i = 0;
        i < parsed.green;
        i++
    ) {
        const land =
            available.find(
                land =>
                    land.color === "G" &&
                    !selected.includes(land)
            );

        if (!land) {
            return null;
        }

        selected.push(land);
    }


    for (
        let i = 0;
        i < parsed.red;
        i++
    ) {
        const land =
            available.find(
                land =>
                    land.color === "R" &&
                    !selected.includes(land)
            );

        if (!land) {
            return null;
        }

        selected.push(land);
    }


    for (
        let i = 0;
        i < parsed.generic;
        i++
    ) {
        const land =
            available.find(
                land =>
                    !selected.includes(land)
            );

        if (!land) {
            return null;
        }

        selected.push(land);
    }

    return selected;
}


// ======================================================
// DRAW
// ======================================================

function drawCard(playerNumber) {
    const player =
        game.players[playerNumber];

    // #57 / v6.2: In Magic, an empty library is not itself a loss.
    // The player loses when they are instructed to draw a card and cannot.
    if (player.library.length === 0) {
        if (!game.gameOver) {
            game.libraryDrawFailed = Number(playerNumber);
        }
        return null;
    }

    const drawn =
        player.library.shift();

    player.hand.push(drawn);

    return drawn;
}

// #37–38 / v4.2: libraries are built, shuffled, then opening hands are dealt inside createNewGame().

// ======================================================
// TURN
// ======================================================

// #42 / v4.6.1: Full turn-structure scaffold + zero-attacker combat fix.
// #43 / v4.7: Explicit automatic Untap Step for lands, creatures and artifacts.
// #44 / v4.8: Explicit Upkeep Step with a central upkeep hook for beginning-of-upkeep triggers.
// #45 / v4.9: Explicit Draw Step with first-player skip rule and a central draw-step event.
// #46 / v5.0: Explicit Precombat Main Phase (Main Phase 1) with a central main-phase hook.
// #47 / v5.1.1: Explicit Beginning of Combat Step before Declare Attackers; phone transition button fix.
// #48 / v5.2: Explicit Declare Attackers Step with centralized entry and attacker validation.
// #49 / v5.3: Explicit Declare Blockers Step with centralized entry and blocker validation.
// #50 / v5.4: Explicit Combat Damage Step; damage resolves only after the active player confirms the step.
// The detailed rules for each step are added in #43–53, but the engine now
// moves through the real Magic turn order instead of jumping straight to Main.
// #54 / v5.9: Priority is available in every step where players may act.
// Untap, Cleanup and Opening Hand do not use a normal priority window.
const PRIORITY_STEPS = new Set([
    "upkeep", "draw", "main1", "begin_combat", "declare_attackers",
    "declare_blockers", "combat_damage", "end_combat", "main2", "end_step"
]);

function stepHasPriority(step = game.turnStep) {
    return PRIORITY_STEPS.has(step);
}

function resetPriorityForStep() {
    if (!stepHasPriority()) return;
    game.priorityPlayer = game.currentPlayer;
    game.consecutivePasses = 0;
}

function setTurnStep(step, phase = step, message = null) {
    game.turnStep = step;
    game.phase = phase;
    resetPriorityForStep();
    if (message) {
        io.emit("gameMessage", { message });
    }
}

// #48 / v5.2: Declare Attackers is a real turn step.
// `phase` stays `choose_attackers` for compatibility with the existing UI,
// while `turnStep` is the canonical Magic step name.
function enterDeclareAttackersStep(playerNumber) {
    game.combat = { attackerIds: [], blockers: {} };
    setTurnStep(
        "declare_attackers",
        "choose_attackers",
        `Player ${playerNumber}: Declare Attackers Step.`
    );

    io.emit("combatMessage", {
        text: `Player ${playerNumber}: vælg dine angribere`
    });
}

// #49 / v5.3: Declare Blockers is a real turn step.
// The defending player chooses any number of legal untapped blockers.
function enterDeclareBlockersStep(attackerNumber) {
    const defenderNumber = attackerNumber === 1 ? 2 : 1;
    game.combat.blockers = {};

    setTurnStep(
        "declare_blockers",
        "choose_blockers",
        `Player ${defenderNumber}: Declare Blockers Step.`
    );

    io.emit("combatMessage", {
        text: `Player ${defenderNumber}: fordel dine blockers`
    });

    io.emit("declareBlockersStarted", {
        attacker: attackerNumber,
        defender: defenderNumber,
        attackerIds: [...game.combat.attackerIds]
    });
}

// #50 / v5.4.2: Combat Damage is a visible, explicit turn step.
// We pause here before applying damage so the step can be seen and tested.
function enterCombatDamageStep(attackerNumber) {
    setTurnStep(
        "combat_damage",
        "combat_damage",
        `Player ${attackerNumber}: Combat Damage Step.`
    );

    io.emit("combatMessage", {
        text: "Combat Damage Step – afgør combat damage"
    });

    io.emit("combatDamageStarted", {
        attacker: attackerNumber,
        defender: attackerNumber === 1 ? 2 : 1
    });

    sendGameState();
}

// #51 / v5.5: End of Combat is now a real, visible turn step.
// Combat objects are kept until the player explicitly continues to Main Phase 2.
function enterEndCombatStep(playerNumber) {
    setTurnStep(
        "end_combat",
        "end_combat",
        `Player ${playerNumber}: End of Combat Step.`
    );

    io.emit("combatMessage", {
        text: "End of Combat Step"
    });

    io.emit("endCombatStarted", { player: playerNumber });
    sendGameState();
}

// #43 / v4.7: Untap Step.
// At the beginning of a player's turn, all lands, creatures and artifacts
// that player controls untap automatically. This is intentionally not a
// player choice: Magic's normal Untap Step untaps them as a turn-based action.
function performUntapStep(playerNumber) {
    const player = game.players[playerNumber];

    setTurnStep("untap", "untap", `Player ${playerNumber}: Untap Step.`);

    let untappedCount = 0;
    [player.lands, player.creatures, player.artifacts].forEach(zone => {
        zone.forEach(permanent => {
            if (permanent.tapped) untappedCount += 1;
            permanent.tapped = false;
        });
    });

    io.emit("gameMessage", {
        message: untappedCount > 0
            ? `Player ${playerNumber} untapper ${untappedCount} permanent${untappedCount === 1 ? "" : "er"}.`
            : `Player ${playerNumber} har ingen tappede permanents at untappe.`
    });
}

// #44 / v4.8: Upkeep Step.
// This is now a dedicated engine step instead of only a label between Untap and Draw.
// Future "at the beginning of your upkeep" cards can be registered here without
// changing the rest of the turn-start flow. Priority inside Upkeep is added in #54.
function performUpkeepStep(playerNumber) {
    setTurnStep("upkeep", "upkeep", `Player ${playerNumber}: Upkeep Step.`);

    // Central hook for upkeep-trigger processing. No current test card has an
    // upkeep trigger yet, so the step normally completes with zero triggers.
    const queuedTriggers = [];

    game.lastUpkeep = {
        player: playerNumber,
        turnNumber: game.turnNumber,
        triggerCount: queuedTriggers.length
    };

    io.emit("upkeepStep", {
        player: playerNumber,
        turnNumber: game.turnNumber,
        triggerCount: queuedTriggers.length,
        message: `Player ${playerNumber}: Upkeep Step færdig (${queuedTriggers.length} triggers).`
    });
}

// #45 / v4.9: Draw Step.
// The turn-based draw now lives in one dedicated function instead of being
// embedded directly in startTurn(). This prevents accidental double draws as
// the remaining turn steps are expanded in #46–53.
function performDrawStep(playerNumber) {
    setTurnStep("draw", "draw", `Player ${playerNumber}: Draw Step.`);

    const skipsOpeningDraw = game.firstTurn && playerNumber === 1;
    let drawnCard = null;

    if (!skipsOpeningDraw) {
        drawnCard = drawCard(playerNumber);
    }

    game.lastDrawStep = {
        player: playerNumber,
        turnNumber: game.turnNumber,
        skipped: skipsOpeningDraw,
        drewCard: Boolean(drawnCard),
        libraryEmpty: !skipsOpeningDraw && !drawnCard
    };

    let message;
    if (skipsOpeningDraw) {
        message = "Player 1 springer sit første Draw Step over.";
    } else if (drawnCard) {
        message = `Player ${playerNumber} trækker 1 kort i Draw Step.`;
    } else {
        message = `Player ${playerNumber} forsøger at trække et kort i Draw Step, men Library er tomt.`;
    }

    io.emit("drawStep", {
        player: playerNumber,
        turnNumber: game.turnNumber,
        skipped: skipsOpeningDraw,
        drewCard: Boolean(drawnCard),
        message
    });

    io.emit("gameMessage", { message });
    game.firstTurn = false;
}

// #46 / v5.0: Precombat Main Phase (Main Phase 1).
// This is now its own engine action rather than a raw phase assignment inside
// startTurn(). Lands, creatures, sorceries and other normal active-player plays
// continue to use phase === "main"; detailed priority/timing is expanded in #54/#65.
function performPrecombatMainPhase(playerNumber) {
    setTurnStep("main1", "main", `Player ${playerNumber}: Precombat Main Phase.`);

    game.lastMainPhase = {
        player: playerNumber,
        turnNumber: game.turnNumber,
        kind: "precombat",
        landPlayedThisTurn: Boolean(game.players[playerNumber].landPlayedThisTurn)
    };

    io.emit("mainPhaseStarted", {
        player: playerNumber,
        turnNumber: game.turnNumber,
        kind: "precombat",
        message: `Player ${playerNumber}: Main Phase 1 er startet.`
    });
}

// #52 / v5.6: Postcombat Main Phase (Main Phase 2).
// This mirrors Main Phase 1 for normal active-player plays, but keeps the
// shared landPlayedThisTurn flag so a player does not get an extra land play.
function performPostcombatMainPhase(playerNumber) {
    setTurnStep("main2", "main2", `Player ${playerNumber}: Main Phase 2.`);

    game.lastMainPhase = {
        player: playerNumber,
        turnNumber: game.turnNumber,
        kind: "postcombat",
        landPlayedThisTurn: Boolean(game.players[playerNumber].landPlayedThisTurn)
    };

    io.emit("mainPhaseStarted", {
        player: playerNumber,
        turnNumber: game.turnNumber,
        kind: "postcombat",
        message: `Player ${playerNumber}: Main Phase 2 er startet.`
    });

    io.emit("gameMessage", {
        message: `Player ${playerNumber}: Main Phase 2.`
    });
}

// v5.6.2: If the active player declares no attackers, the remaining empty
// combat steps are passed automatically and play lands in Main Phase 2.
// This is only a convenience shortcut; END TURN is not involved.
function skipEmptyCombatToMain2(playerNumber) {
    game.combat = { attackerIds: [], blockers: {} };

    io.emit("combatMessage", {
        text: `Player ${playerNumber} angriber ikke – tom combat afsluttes automatisk.`
    });

    io.emit("gameMessage", {
        message: `Player ${playerNumber}: ingen angribere. Declare Blockers, Combat Damage og End of Combat passeres automatisk.`
    });

    performPostcombatMainPhase(playerNumber);
    sendGameState();
}

// #53 / v5.7: Ending Phase is now explicit.
function performEndStep(playerNumber) {
    setTurnStep("end_step", "end_step", `Player ${playerNumber}: End Step.`);
    io.emit("gameMessage", { message: `Player ${playerNumber}: End Step.` });
    sendGameState();
}

function performCleanupStep(playerNumber) {
    setTurnStep("cleanup", "cleanup", `Player ${playerNumber}: Cleanup Step.`);

    // Damage and "until end of turn" bonuses disappear in Cleanup, not at next turn start.
    [1, 2].forEach(number => {
        game.players[number].creatures.forEach(creature => {
            creature.damageMarked = 0;

            const tempPower = Number(creature.tempPowerBonus || 0);
            const tempToughness = Number(creature.tempToughnessBonus || 0);
            if (tempPower || tempToughness) {
                creature.power = Number(creature.power) - tempPower;
                creature.toughness = Number(creature.toughness) - tempToughness;
                creature.tempPowerBonus = 0;
                creature.tempToughnessBonus = 0;
            }
        });
    });

    // #55 / v6.0: Maximum hand size is 7 during the active player's Cleanup Step.
    // If they have too many cards, pause the turn here until they choose which
    // cards to discard. The next player's turn does not begin early.
    const activePlayer = game.players[playerNumber];
    const excessCards = Math.max(0, activePlayer.hand.length - 7);

    if (excessCards > 0) {
        game.pendingDiscard = {
            player: playerNumber,
            count: excessCards,
            source: "Cleanup – maximum 7 kort",
            kind: "cleanup_hand_limit"
        };

        io.emit("gameMessage", {
            message: `Player ${playerNumber} har ${activePlayer.hand.length} kort på hånden og skal discarde ${excessCards} til maximum hand size 7.`
        });
        sendGameState();
        return false;
    }

    io.emit("gameMessage", { message: `Player ${playerNumber}: Cleanup Step – damage og midlertidige effekter fjernes. Hånden er ${activePlayer.hand.length}/7.` });
    sendGameState();
    return true;
}

function finishTurnAfterCleanup(playerNumber) {
    game.currentPlayer = playerNumber === 1 ? 2 : 1;
    game.turnNumber++;
    startTurn(game.currentPlayer);
}

function startTurn(playerNumber) {
    const player =
        game.players[playerNumber];

    game.combat = {
        attackerIds: [],
        blockers: {}
    };

    player.landPlayedThisTurn =
        false;

    performUntapStep(playerNumber);

    performUpkeepStep(playerNumber);
    performDrawStep(playerNumber);
    performPrecombatMainPhase(playerNumber);

    io.emit(
        "turnStarted",
        {
            player: playerNumber,
            turnNumber:
                game.turnNumber
        }
    );


    sendGameState();
}


// ======================================================
// MANA STATUS
// ======================================================

function getManaStatus(playerNumber) {
    const lands = game.players[playerNumber].lands;
    const untapped = lands.filter(land => !land.tapped);

    return {
        green: untapped.filter(land => land.color === "G").length,
        red: untapped.filter(land => land.color === "R").length,
        available: untapped.length,
        total: lands.length
    };
}


// ======================================================
// PUBLIC STATE
// ======================================================

function publicPlayer(number) {
    const player =
        game.players[number];

    return {
        life:
            player.life,

        handCount:
            player.hand.length,

        libraryCount:
            player.library.length,

        graveyardCount:
            player.graveyard.length,

        lands:
            player.lands,

        creatures:
            player.creatures,

        enchantments:
            player.enchantments,

        artifacts:
            player.artifacts,

        exile:
            player.exile
    };
}


function getPublicGameState() {
    return {
        currentPlayer:
            game.currentPlayer,

        turnNumber:
            game.turnNumber,

        phase:
            game.phase,

        turnStep:
            game.turnStep,
        lastUpkeep: game.lastUpkeep || null,
        lastMainPhase: game.lastMainPhase || null,

        combat:
            game.combat,

        stack: game.stack,
        priorityPlayer: game.priorityPlayer,
        pendingPriorityTransition: game.pendingPriorityTransition,
        pendingDiscard: game.pendingDiscard,
        openingHandReady: game.openingHandReady,
        mulliganCount: game.mulliganCount,
        pendingMulliganBottom: game.pendingMulliganBottom,
        selectedDecks: game.selectedDecks || { 1: null, 2: null },
        deckValidation: getDeckValidationState(),
        deckRules: { size: DECK_RULES.size, maxCopies: DECK_RULES.maxCopies },
        gameOver: Boolean(game.gameOver),
        winner: game.winner || null,
        loser: game.loser || null,
        gameOverReason: game.gameOverReason || null,

        players: {
            1: publicPlayer(1),
            2: publicPlayer(2)
        }
    };
}


// #56 / v6.1 + #57 / v6.2: Central game-loss check.
// A player loses at 0 or less life, or after attempting to draw from an empty library.
// An empty library by itself is legal until a draw is attempted.
function checkGameLoss() {
    if (game.gameOver) return true;

    const reasons = new Map();

    [1, 2].forEach(playerNumber => {
        if (Number(game.players[playerNumber].life) <= 0) {
            reasons.set(playerNumber, `Player ${playerNumber} er på 0 eller mindre life.`);
        }
    });

    if (game.libraryDrawFailed === 1 || game.libraryDrawFailed === 2) {
        const loser = Number(game.libraryDrawFailed);
        reasons.set(loser, `Player ${loser} forsøgte at trække et kort fra et tomt Library.`);
    }

    if (reasons.size === 0) return false;

    const losers = [...reasons.keys()];
    if (losers.length >= 2) {
        game.gameOver = true;
        game.winner = null;
        game.loser = null;
        game.gameOverReason = losers.map(playerNumber => reasons.get(playerNumber)).join(" ");
    } else {
        const loser = losers[0];
        const winner = loser === 1 ? 2 : 1;
        game.gameOver = true;
        game.winner = winner;
        game.loser = loser;
        game.gameOverReason = reasons.get(loser);
    }

    game.phase = "game_over";
    game.turnStep = "game_over";
    game.pendingPriorityTransition = null;
    game.pendingDiscard = null;

    let message;
    if (game.winner) {
        const libraryLoss = game.libraryDrawFailed === game.loser;
        message = libraryLoss
            ? `🏆 PLAYER ${game.winner} VINDER! Player ${game.loser} kunne ikke trække fra sit tomme Library.`
            : `🏆 PLAYER ${game.winner} VINDER! Player ${game.loser} er på ${game.players[game.loser].life} life.`;
    } else {
        message = `GAME OVER — ${game.gameOverReason}`;
    }

    io.emit("gameOver", {
        winner: game.winner,
        loser: game.loser,
        reason: game.gameOverReason,
        message
    });
    io.emit("gameMessage", { message });
    io.emit("combatMessage", { text: message });
    return true;
}

function sendGameState() {
    checkGameLoss();
    io.emit(
        "gameState",
        getPublicGameState()
    );
}


function sendPlayerView(
    socket,
    playerNumber
) {
    const player =
        game.players[playerNumber];

    const opponent =
        playerNumber === 1 ? 2 : 1;

    socket.emit(
        "playerView",
        {
            player:
                playerNumber,

            hand:
                player.hand,

            life:
                player.life,

            libraryCount:
                player.library.length,

            graveyardCount:
                player.graveyard.length,

            graveyard:
                player.graveyard,

            lands:
                player.lands,

            mana:
                getManaStatus(playerNumber),

            currentPlayer:
                game.currentPlayer,

            turnNumber:
                game.turnNumber,

            phase:
                game.phase,

            turnStep:
                game.turnStep,
            lastUpkeep: game.lastUpkeep || null,
            lastMainPhase: game.lastMainPhase || null,
        lastMainPhase: game.lastMainPhase || null,

            pendingDiscard:
                game.pendingDiscard,

            openingHandReady:
                game.openingHandReady,

            mulliganCount:
                game.mulliganCount,

            pendingMulliganBottom:
                game.pendingMulliganBottom,

            selectedDecks:
                game.selectedDecks || { 1: null, 2: null },

            creatures:
                player.creatures,

            enchantments:
                player.enchantments,

            artifacts:
                player.artifacts,

            exile:
                player.exile,

            opponentCreatures:
                game.players[
                    opponent
                ].creatures,

            combat:
                game.combat,

            stack: game.stack,
            priorityPlayer: game.priorityPlayer,
            gameOver: Boolean(game.gameOver),
            winner: game.winner || null,
            loser: game.loser || null,
            gameOverReason: game.gameOverReason || null
        }
    );
}


function moveAttachedAurasToGraveyard(creatureId) {
    [1, 2].forEach(playerNumber => {
        const owner = game.players[playerNumber];
        const staying = [];

        owner.enchantments.forEach(enchantment => {
            if (enchantment.attachedTo === creatureId) {
                owner.graveyard.push(enchantment);
            } else {
                staying.push(enchantment);
            }
        });

        owner.enchantments = staying;
    });
}


function queueEtbAbility(controllerNumber, enteredCreature) {
    if (!enteredCreature.etbAbility) return 0;

    game.stack.push({
        kind: "etb_ability",
        caster: controllerNumber,
        card: enteredCreature,
        sourceId: enteredCreature.id,
        ability: { ...enteredCreature.etbAbility },
        target: null
    });

    game.priorityPlayer = game.currentPlayer;
    game.consecutivePasses = 0;
    return 1;
}

function queueCreatureEnteredTriggers(controllerNumber, enteredCreature) {
    const controller = game.players[controllerNumber];
    let count = 0;

    controller.creatures.forEach(source => {
        if (
            source.id !== enteredCreature.id &&
            source.triggeredAbility?.event === "another_creature_enters"
        ) {
            game.stack.push({
                kind: "triggered_ability",
                caster: controllerNumber,
                card: source,
                sourceId: source.id,
                ability: { ...source.triggeredAbility },
                target: null
            });
            count++;
        }
    });

    if (count > 0) {
        game.priorityPlayer = game.currentPlayer;
        game.consecutivePasses = 0;
    }
    return count;
}

// ======================================================
// STACK + PRIORITY (v1.3.1)
// ======================================================

function resolveTopOfStack() {
    const item = game.stack.pop();
    if (!item) return;

    const { caster, card: playedCard, target } = item;
    const player = game.players[caster];
    const opponentNumber = caster === 1 ? 2 : 1;
    let message = "";

    if (item.kind === "etb_ability") {
        const ability = item.ability || {};

        if (ability.effect === "gain_life") {
            const amount = Number(ability.amount || 0);
            player.life += amount;
            message = `${playedCard.name}: ETB ability resolver. Player ${caster} får ${amount} life og er nu på ${player.life}.`;
        } else {
            message = `${playedCard.name}: ETB ability resolver.`;
        }

        io.emit("spellResolved", { caster, card: playedCard, target: null, targetId: null, targetPlayer: null, message });
        io.emit("combatMessage", { text: message });
        return;
    }

    if (item.kind === "triggered_ability") {
        const ability = item.ability || {};

        if (ability.effect === "gain_life") {
            const amount = Number(ability.amount || 0);
            player.life += amount;
            message = `${playedCard.name}: triggered ability resolver. Player ${caster} får ${amount} life og er nu på ${player.life}.`;
        } else {
            message = `${playedCard.name}: triggered ability resolver.`;
        }

        io.emit("spellResolved", { caster, card: playedCard, target: null, targetId: null, targetPlayer: null, message });
        io.emit("combatMessage", { text: message });
        return;
    }

    if (item.kind === "activated_ability") {
        const ability = item.ability || {};
        if (ability.effect === "gain_life") {
            const amount = Number(ability.amount || 0);
            player.life += amount;
            message = `${playedCard.name}: activated ability resolver. Player ${caster} får ${amount} life og er nu på ${player.life}.`;
        } else {
            message = `${playedCard.name}: activated ability resolver.`;
        }
        io.emit("spellResolved", { caster, card: playedCard, target: null, targetId: null, targetPlayer: null, message });
        io.emit("combatMessage", { text: message });
        return;
    }

    if (playedCard.type === "creature") {
        const creaturePermanent = {
            ...playedCard,
            tapped: false,
            enteredTurn: game.turnNumber
        };
        player.creatures.push(creaturePermanent);
        const etbCount = queueEtbAbility(caster, creaturePermanent);
        const triggerCount = queueCreatureEnteredTriggers(caster, creaturePermanent);
        const totalTriggers = etbCount + triggerCount;
        message = `${playedCard.name} resolver og kommer på battlefieldet.` +
            (totalTriggers > 0 ? ` ${totalTriggers} triggered ability går på stacken.` : "");
        io.emit("spellResolved", { caster, card: playedCard, target: null, targetId: null, targetPlayer: null, message });
        io.emit("combatMessage", { text: message });
        return;
    }

    if (playedCard.type === "artifact") {
        const permanent = {
            ...playedCard,
            tapped: false,
            enteredTurn: game.turnNumber
        };

        player.artifacts.push(permanent);

        if (playedCard.effect === "life_on_entry") {
            const amount = Number(playedCard.amount || 0);
            player.life += amount;
            message = `${playedCard.name} resolver og kommer på battlefieldet. Player ${caster} får ${amount} life og er nu på ${player.life}.`;
        } else {
            message = `${playedCard.name} resolver og kommer på battlefieldet som et Artifact.`;
        }

        io.emit("spellResolved", {
            caster,
            card: playedCard,
            target: null,
            targetId: null,
            targetPlayer: null,
            message
        });
        io.emit("combatMessage", { text: message });
        return;
    }

    if (playedCard.effect === "draw_cards") {
        const amount = Math.max(0, Number(playedCard.amount || 0));
        const drawn = [];
        for (let i = 0; i < amount; i++) {
            const cardDrawn = drawCard(caster);
            if (!cardDrawn) break;
            drawn.push(cardDrawn);
        }
        player.graveyard.push(playedCard);
        message = `${playedCard.name} resolver. Player ${caster} trækker ${drawn.length} kort.`;
        io.emit("spellResolved", { caster, card: playedCard, target: null, targetId: null, targetPlayer: null, message });
        io.emit("combatMessage", { text: message });
        return;
    }

    if (playedCard.effect === "discard_cards") {
        const targetPlayer = target && target.type === "player" ? Number(target.player) : opponentNumber;
        const victim = game.players[targetPlayer];
        const amount = Math.min(Math.max(0, Number(playedCard.amount || 0)), victim.hand.length);
        player.graveyard.push(playedCard);

        if (amount > 0) {
            game.pendingDiscard = {
                player: targetPlayer,
                count: amount,
                source: playedCard.name,
                caster
            };
            message = `${playedCard.name} resolver. Player ${targetPlayer} skal vælge ${amount} kort at discarde.`;
        } else {
            message = `${playedCard.name} resolver, men Player ${targetPlayer} har ingen kort på hånden.`;
        }
        io.emit("spellResolved", { caster, card: playedCard, target, targetId: null, targetPlayer, message });
        io.emit("combatMessage", { text: message });
        return;
    }

    if (playedCard.effect === "return_creature_from_graveyard") {
        if (!target || target.type !== "graveyard_creature" || target.player !== caster) {
            player.graveyard.push(playedCard);
            message = `${playedCard.name} fizzler: intet gyldigt creature-kort i din graveyard.`;
            io.emit("spellResolved", { caster, card: playedCard, target, targetId: null, targetPlayer: null, message });
            io.emit("combatMessage", { text: message });
            return;
        }

        const graveIndex = player.graveyard.findIndex(
            c => c.id === target.id && c.type === "creature"
        );

        if (graveIndex === -1) {
            player.graveyard.push(playedCard);
            message = `${playedCard.name} fizzler: target er ikke længere i graveyard.`;
            io.emit("spellResolved", { caster, card: playedCard, target, targetId: target.id, targetPlayer: caster, message });
            io.emit("combatMessage", { text: message });
            return;
        }

        const returnedCard = player.graveyard.splice(graveIndex, 1)[0];
        const creaturePermanent = {
            ...returnedCard,
            tapped: false,
            enteredTurn: game.turnNumber,
            markedDamage: 0
        };

        player.creatures.push(creaturePermanent);

        const etbCount = queueEtbAbility(caster, creaturePermanent);
        const triggerCount = queueCreatureEnteredTriggers(caster, creaturePermanent);
        const totalTriggers = etbCount + triggerCount;

        // The reanimation spell itself goes to graveyard after resolution.
        player.graveyard.push(playedCard);

        message = `${playedCard.name} returnerer ${returnedCard.name} fra graveyard til battlefieldet.` +
            (totalTriggers > 0 ? ` ${totalTriggers} triggered ability går på stacken.` : "");

        io.emit("spellResolved", {
            caster,
            card: playedCard,
            target,
            targetId: returnedCard.id,
            targetPlayer: caster,
            message
        });
        io.emit("combatMessage", { text: message });
        return;
    }

    if (playedCard.effect === "exile_creature") {
        if (!target || target.type !== "creature") {
            player.graveyard.push(playedCard);
            message = `${playedCard.name} fizzler: intet gyldigt creature-target.`;
            io.emit("spellResolved", { caster, card: playedCard, target, targetId: null, targetPlayer: null, message });
            io.emit("combatMessage", { text: message });
            return;
        }

        const targetPlayer = game.players[target.player];
        const victimIndex = targetPlayer.creatures.findIndex(c => c.id === target.id);

        if (victimIndex === -1) {
            player.graveyard.push(playedCard);
            message = `${playedCard.name} fizzler: target er ikke længere på battlefieldet.`;
            io.emit("spellResolved", { caster, card: playedCard, target, targetId: target.id, targetPlayer: target.player, message });
            io.emit("combatMessage", { text: message });
            return;
        }

        const victim = targetPlayer.creatures[victimIndex];
        moveAttachedAurasToGraveyard(victim.id);
        targetPlayer.creatures.splice(victimIndex, 1);

        if (victim.isToken) {
            message = `${playedCard.name} exiler ${victim.name}-tokenen. Tokenen forlader spillet.`;
        } else {
            targetPlayer.exile.push(victim);
            message = `${playedCard.name} exiler ${victim.name}. Kortet ligger nu i Player ${target.player}s Exile zone.`;
        }

        player.graveyard.push(playedCard);

        io.emit("spellResolved", {
            caster,
            card: playedCard,
            target,
            targetId: victim.id,
            targetPlayer: target.player,
            message
        });
        io.emit("combatMessage", { text: message });
        return;
    }

    if (playedCard.effect === "aura_buff") {
        const ownerNumber = Number(target?.player);
        const victim = game.players[ownerNumber]?.creatures.find(c => c.id === target?.id);

        if (!victim) {
            player.graveyard.push(playedCard);
            message = `${playedCard.name} fizzler — creaturet findes ikke længere, så Auraen går i graveyard.`;
        } else {
            const powerBonus = Number(playedCard.powerBonus || 0);
            const toughnessBonus = Number(playedCard.toughnessBonus || 0);

            const permanentAura = {
                ...playedCard,
                attachedTo: victim.id,
                attachedPlayer: ownerNumber
            };

            player.enchantments.push(permanentAura);
            victim.power = Number(victim.power) + powerBonus;
            victim.toughness = Number(victim.toughness) + toughnessBonus;
            victim.attachedAuras = Array.isArray(victim.attachedAuras) ? victim.attachedAuras : [];
            victim.attachedAuras.push({
                id: permanentAura.id,
                name: permanentAura.name,
                icon: permanentAura.icon,
                powerBonus,
                toughnessBonus,
                controller: caster
            });

            message = `${playedCard.name} enchants ${victim.name}. ${victim.name} får +${powerBonus}/+${toughnessBonus}, så længe Auraen bliver siddende. Nu ${victim.power}/${victim.toughness}.`;
        }

        io.emit("spellResolved", {
            caster,
            card: playedCard,
            target,
            targetId: target?.id || null,
            targetPlayer: Number(target?.player || 0) || null,
            message
        });
        io.emit("combatMessage", { text: message });
        return;
    }

    if (playedCard.effect === "pump") {
        const ownerNumber = Number(target.player);
        const victim = game.players[ownerNumber].creatures.find(c => c.id === target.id);
        if (!victim) {
            message = `${playedCard.name} fizzler — målet findes ikke længere.`;
        } else {
            const powerBonus = Number(playedCard.powerBonus || 0);
            const toughnessBonus = Number(playedCard.toughnessBonus || 0);
            victim.power = Number(victim.power) + powerBonus;
            victim.toughness = Number(victim.toughness) + toughnessBonus;
            victim.tempPowerBonus = Number(victim.tempPowerBonus || 0) + powerBonus;
            victim.tempToughnessBonus = Number(victim.tempToughnessBonus || 0) + toughnessBonus;
            message = `${playedCard.name}: ${victim.name} får +${powerBonus}/+${toughnessBonus} indtil turens afslutning. Nu ${victim.power}/${victim.toughness}.`;
        }
    } else if (playedCard.effect === "plus1_counter") {
        const ownerNumber = Number(target.player);
        const victim = game.players[ownerNumber].creatures.find(c => c.id === target.id);
        if (!victim) {
            message = `${playedCard.name} fizzler — målet findes ikke længere.`;
        } else {
            const amount = Number(playedCard.counters || 1);
            victim.plus1Counters = Number(victim.plus1Counters || 0) + amount;
            victim.power = Number(victim.power) + amount;
            victim.toughness = Number(victim.toughness) + amount;
            message = `${playedCard.name}: ${victim.name} får ${amount} permanent +1/+1 counter. Nu ${victim.power}/${victim.toughness}.`;
        }
    } else if (playedCard.effect === "create_tokens") {
        const count = Number(playedCard.tokenCount || 1);
        const power = Number(playedCard.tokenPower || 1);
        const toughness = Number(playedCard.tokenToughness || 1);

        let triggerCount = 0;
        for (let i = 0; i < count; i++) {
            const tokenPermanent = {
                ...creature(
                    playedCard.tokenName || "Token",
                    playedCard.tokenIcon || "●",
                    "",
                    power,
                    toughness,
                    []
                ),
                isToken: true,
                tapped: false,
                enteredTurn: game.turnNumber
            };
            player.creatures.push(tokenPermanent);
            triggerCount += queueEtbAbility(caster, tokenPermanent);
            triggerCount += queueCreatureEnteredTriggers(caster, tokenPermanent);
        }

        message = `${playedCard.name}: Player ${caster} skaber ${count} ${power}/${toughness} ${playedCard.tokenName || "Token"} creature tokens.` +
            (triggerCount > 0 ? ` ${triggerCount} triggered abilities går på stacken.` : "");
    } else if (target.type === "player") {
        const victim = game.players[Number(target.player)];
        victim.life -= Number(playedCard.damage || 0);
        message = `${playedCard.name} rammer Player ${target.player} for ${playedCard.damage} damage.`;
    } else {
        const ownerNumber = Number(target.player);
        const owner = game.players[ownerNumber];
        const idx = owner.creatures.findIndex(c => c.id === target.id);
        if (idx === -1) {
            message = `${playedCard.name} fizzler — målet findes ikke længere.`;
        } else {
            const victim = owner.creatures[idx];
            if (Array.isArray(victim.abilities) && victim.abilities.includes("protection_red") && String(playedCard.cost || "").includes("R")) {
                message = `${playedCard.name} fizzler — ${victim.name} har Protection from Red.`;
                player.graveyard.push(playedCard);
                io.emit("spellResolved", { caster, card: playedCard, target, targetId: target.id, targetPlayer: Number(target.player), message });
                io.emit("combatMessage", { text: message });
                return;
            }
            victim.damageMarked = Number(victim.damageMarked || 0) + Number(playedCard.damage || 0);
            message = `${playedCard.name} rammer ${victim.name} for ${playedCard.damage} damage.`;
            const victimIndestructible =
                Array.isArray(victim.abilities) &&
                victim.abilities.includes("indestructible");

            if (
                victim.damageMarked >= Number(victim.toughness) &&
                !victimIndestructible
            ) {
                moveAttachedAurasToGraveyard(victim.id);
                owner.creatures.splice(idx, 1);
                if (!victim.isToken) {
                    owner.graveyard.push(victim);
                    message += ` ${victim.name} dør og går i graveyard.`;
                } else {
                    message += ` ${victim.name}-tokenet dør og forsvinder.`;
                }
            } else if (
                victim.damageMarked >= Number(victim.toughness) &&
                victimIndestructible
            ) {
                message += ` ${victim.name} har ${victim.damageMarked} damage markeret, men overlever pga. Indestructible.`;
            } else {
                message += ` ${victim.name} har ${victim.damageMarked} damage markeret.`;
            }
        }
    }

    player.graveyard.push(playedCard);
    io.emit("spellResolved", { caster, card: playedCard, target, targetId: target.type === "creature" ? target.id : null, targetPlayer: Number(target.player), message });
    io.emit("combatMessage", { text: message });

    if (game.players[opponentNumber].life <= 0) io.emit("gameOver", { winner: caster });
}

function resetPriority() {
    game.priorityPlayer = game.currentPlayer;
    game.consecutivePasses = 0;
}

// ======================================================
// SMART PRIORITY (#54 / v5.9.3)
// ======================================================

function canPayManaNow(playerNumber, cost = "") {
    return !!findLandsToPay(playerNumber, cost || "");
}

function hasUsableActivatedAbility(playerNumber) {
    const player = game.players[playerNumber];
    return player.artifacts.some(artifact => {
        const ability = artifact.activatedAbility;
        if (!ability) return false;
        if (ability.cost === "tap") return !artifact.tapped;
        if (ability.cost === "sacrifice_creature") return player.creatures.length > 0;
        return true;
    });
}

// v5.9.5: Smart Priority must check whether an instant actually has a legal
// target, not merely whether the card is in hand and its mana cost can be paid.
function instantHasLegalTargetNow(playerNumber, card) {
    // Flash creatures do not target when cast.
    if (card.type === "creature") return true;

    // Current instant pump/counter spells require a creature target.  They may
    // target your own creature, or an opponent creature if targeting rules allow it.
    if (card.effect === "pump" || card.effect === "plus1_counter") {
        for (const ownerNumber of [1, 2]) {
            for (const creature of game.players[ownerNumber].creatures) {
                if (ownerNumber !== playerNumber) {
                    const abilities = Array.isArray(creature.abilities) ? creature.abilities : [];
                    if (abilities.includes("hexproof")) continue;
                    if (abilities.includes("protection_red") && String(card.cost || "").includes("R")) continue;

                    // Ward 2 is implemented in this prototype as an extra payment.
                    // Only count this as a legal response if the normal spell cost
                    // plus two additional untapped lands can actually be paid.
                    if (abilities.includes("ward_2")) {
                        const normal = findLandsToPay(playerNumber, card.cost || "");
                        if (!normal) continue;
                        const used = new Set(normal.map(l => l.id));
                        const extra = game.players[playerNumber].lands.filter(l => !l.tapped && !used.has(l.id));
                        if (extra.length < 2) continue;
                    }
                }
                return true;
            }
        }
        return false;
    }

    // Damage instants can always target the opponent player in the current rules,
    // so no creature needs to exist for them to be a real response.
    if (card.effect === "damage") return true;

    // Future targetless instants should remain usable unless their own legality
    // rule says otherwise.
    return true;
}

function hasInstantSpeedResponse(playerNumber) {
    const player = game.players[playerNumber];
    const playableFromHand = player.hand.some(card => {
        const isInstant = card.type === "spell" && card.speed === "instant";
        const hasFlash = card.type === "creature" && Array.isArray(card.abilities) && card.abilities.includes("flash");
        if (!(isInstant || hasFlash)) return false;
        if (!canPayManaNow(playerNumber, card.cost)) return false;
        return instantHasLegalTargetNow(playerNumber, card);
    });
    return playableFromHand || hasUsableActivatedAbility(playerNumber);
}

// v5.9.7: Central auto-pass chain for EVERYTHING already on the stack.
// Start with the player who should receive priority. Players with no legal
// instant/Flash/activated response are skipped automatically. If neither
// player can act, the top object resolves without showing a pointless button.
function smartAdvanceStackPriority(startPlayer = game.currentPlayer) {
    if (game.stack.length === 0 || game.pendingDiscard) {
        game.priorityPlayer = game.currentPlayer;
        game.consecutivePasses = 0;
        return false;
    }

    let candidate = Number(startPlayer) === 2 ? 2 : 1;

    for (let checked = 0; checked < 2; checked++) {
        if (hasInstantSpeedResponse(candidate)) {
            game.priorityPlayer = candidate;
            game.consecutivePasses = checked;
            return true;
        }

        io.emit("gameMessage", {
            message: `Player ${candidate} har ingen mulig reaktion og auto-passer priority.`
        });
        candidate = candidate === 1 ? 2 : 1;
    }

    game.consecutivePasses = 0;
    resolveTopOfStack();

    // Resolving a spell/permanent can create ETB/triggered abilities. Run the
    // exact same smart scan again instead of exposing raw priority clicks.
    if (game.stack.length > 0 && !game.pendingDiscard) {
        return smartAdvanceStackPriority(game.currentPlayer);
    }

    game.priorityPlayer = game.currentPlayer;
    game.consecutivePasses = 0;
    return false;
}

// v5.9.4: A newly cast spell should not create a pointless response click.
// If the opponent has no legal instant-speed resource available, the top
// object resolves immediately. Otherwise the opponent receives the response window.
function offerStackResponseOrAutoResolve(casterNumber) {
    const opponent = casterNumber === 1 ? 2 : 1;
    game.consecutivePasses = 0;

    if (!hasInstantSpeedResponse(opponent)) {
        io.emit("gameMessage", {
            message: `Player ${opponent} har ingen mulig reaktion – stacken resolver automatisk.`
        });
        resolveTopOfStack();
        if (game.stack.length > 0 && !game.pendingDiscard) {
            smartAdvanceStackPriority(game.currentPlayer);
        } else {
            game.priorityPlayer = game.currentPlayer;
            game.consecutivePasses = 0;
        }
        sendGameState();
        return false;
    }

    game.priorityPlayer = opponent;
    return true;
}

function executePriorityTransition(transition) {
    const active = game.currentPlayer;
    game.pendingPriorityTransition = null;
    game.consecutivePasses = 0;
    game.priorityPlayer = active;

    if (transition === "start_combat") {
        // If there is nobody who can legally attack, the digital UI skips the
        // empty combat sequence. The rules engine still records the transition.
        const hasAttacker = game.players[active].creatures.some(canAttack);
        if (!hasAttacker) {
            io.emit("gameMessage", { message: `Player ${active} har ingen mulige angribere – tom Combat springes automatisk over.` });
            skipEmptyCombatToMain2(active);
            return;
        }
        setTurnStep("begin_combat", "begin_combat", `Player ${active}: Beginning of Combat Step.`);
        game.combat = { attackerIds: [], blockers: {} };
        io.emit("combatMessage", { text: `Player ${active}: Beginning of Combat` });
    } else if (transition === "declare_attackers") {
        enterDeclareAttackersStep(active);
    } else if (transition === "end_turn") {
        performEndStep(active);
        const cleanupComplete = performCleanupStep(active);
        if (cleanupComplete) {
            finishTurnAfterCleanup(active);
        }
        return;
    }
    sendGameState();
}

function requestSmartResponse(activePlayer, transition, message) {
    const opponent = activePlayer === 1 ? 2 : 1;
    game.pendingPriorityTransition = transition;

    // No legal instant-speed action = no pointless response button.
    if (!hasInstantSpeedResponse(opponent)) {
        executePriorityTransition(transition);
        return;
    }

    game.consecutivePasses = 1; // active player's click is the implicit first pass
    game.priorityPlayer = opponent;
    io.emit("gameMessage", { message });
    sendGameState();
}

// ======================================================
// COMBAT
// ======================================================

function canAttack(creature) {
    const abilities =
        Array.isArray(creature?.abilities)
            ? creature.abilities
            : [];

    const hasHaste =
        abilities.includes("haste");

    const hasDefender =
        abilities.includes("defender");

    return (
        !creature.tapped &&
        !hasDefender &&
        (
            creature.enteredTurn < game.turnNumber ||
            hasHaste
        )
    );
}


function getAllAssignedBlockers() {
    return Object.values(
        game.combat.blockers
    ).flat();
}


function resolveCombat() {

    const attackerPlayer = game.currentPlayer;
    const defenderPlayer = attackerPlayer === 1 ? 2 : 1;
    const attackerOwner = game.players[attackerPlayer];
    const defender = game.players[defenderPlayer];

    const deadAttackers = new Set();
    const deadBlockers = new Set();
    const damageOnAttackers = new Map();
    const damageOnBlockers = new Map();
    // Track whether a creature has been dealt combat damage by a source with Deathtouch.
    const deathtouchOnAttackers = new Set();
    const deathtouchOnBlockers = new Set();
    const messages = [];

    const hasAbility = (creature, ability) =>
        Array.isArray(creature?.abilities) && creature.abilities.includes(ability);

    const markDamage = (map, creature, amount) => {
        if (!creature || amount <= 0) return;
        map.set(creature.id, (map.get(creature.id) || 0) + amount);
    };

    const applyLifelink = (source, controller, amount) => {
        const damage = Number(amount || 0);
        if (damage <= 0 || !hasAbility(source, "lifelink")) return;
        controller.life += damage;
        messages.push(`${source.name} har Lifelink. Player ${controller === attackerOwner ? attackerPlayer : defenderPlayer} får ${damage} liv.`);
    };

    const updateDeaths = () => {
        attackerOwner.creatures.forEach(creature => {
            const totalDamage =
                Number(creature.damageMarked || 0) +
                Number(damageOnAttackers.get(creature.id) || 0);

            const wouldBeDestroyed =
                deathtouchOnAttackers.has(creature.id) ||
                totalDamage >= Number(creature.toughness || 0);

            if (
                wouldBeDestroyed &&
                !hasAbility(creature, "indestructible")
            ) {
                deadAttackers.add(creature.id);
            }
        });

        defender.creatures.forEach(creature => {
            const totalDamage =
                Number(creature.damageMarked || 0) +
                Number(damageOnBlockers.get(creature.id) || 0);

            const wouldBeDestroyed =
                deathtouchOnBlockers.has(creature.id) ||
                totalDamage >= Number(creature.toughness || 0);

            if (
                wouldBeDestroyed &&
                !hasAbility(creature, "indestructible")
            ) {
                deadBlockers.add(creature.id);
            }
        });
    };

    const dealDamageStep = (firstStrikeStep) => {
        for (const attackerId of game.combat.attackerIds) {
            const attacker = attackerOwner.creatures.find(c => c.id === attackerId);
            if (!attacker || deadAttackers.has(attacker.id)) continue;

            const attackerHasFirstStrike = hasAbility(attacker, "first_strike");
            const attackerHasDoubleStrike = hasAbility(attacker, "double_strike");
            const attackerDealsNow = firstStrikeStep
                ? (attackerHasFirstStrike || attackerHasDoubleStrike)
                : (!attackerHasFirstStrike || attackerHasDoubleStrike);
            const blockerIds = game.combat.blockers[attackerId] || [];
            const liveBlockers = blockerIds
                .map(id => defender.creatures.find(c => c.id === id))
                .filter(blocker => blocker && !deadBlockers.has(blocker.id));

            // Blockers deal damage in the appropriate combat-damage step.
            for (const blocker of liveBlockers) {
                const blockerHasFirstStrike = hasAbility(blocker, "first_strike");
                const blockerHasDoubleStrike = hasAbility(blocker, "double_strike");
                const blockerDealsNow = firstStrikeStep
                    ? (blockerHasFirstStrike || blockerHasDoubleStrike)
                    : (!blockerHasFirstStrike || blockerHasDoubleStrike);
                if (blockerDealsNow) {
                    const rawBlockerDamage = Number(blocker.power || 0);
                    const blockerDamage = hasAbility(attacker, "protection_red") && String(blocker.cost || "").includes("R")
                        ? 0
                        : rawBlockerDamage;
                    markDamage(damageOnAttackers, attacker, blockerDamage);
                    applyLifelink(blocker, defender, blockerDamage);
                    if (rawBlockerDamage > 0 && blockerDamage === 0) {
                        messages.push(`${attacker.name} forhindrer damage fra ${blocker.name} pga. Protection from Red.`);
                    }
                    if (blockerDamage > 0 && hasAbility(blocker, "deathtouch")) {
                        deathtouchOnAttackers.add(attacker.id);
                    }
                }
            }

            if (!attackerDealsNow) continue;

            // Never blocked: damage goes straight to the defending player.
            if (blockerIds.length === 0) {
                const playerDamage = Number(attacker.power || 0);
                defender.life -= playerDamage;
                applyLifelink(attacker, attackerOwner, playerDamage);
                messages.push(
                    `${attacker.name}${firstStrikeStep ? " (First Strike)" : ""} rammer Player ${defenderPlayer} for ${attacker.power}.`
                );
                continue;
            }

            // Once blocked, always blocked for this combat. Trample is the exception
            // that can carry excess damage through to the defending player.
            if (liveBlockers.length === 0) {
                if (hasAbility(attacker, "trample")) {
                    const trampleDamage = Number(attacker.power || 0);
                    defender.life -= trampleDamage;
                    applyLifelink(attacker, attackerOwner, trampleDamage);
                    messages.push(
                        `${attacker.name}${firstStrikeStep ? " (First Strike)" : ""} har Trample. Ingen blocker er tilbage, så ${attacker.power} skade går igennem til Player ${defenderPlayer}.`
                    );
                }
                continue;
            }

            let remainingDamage = Number(attacker.power || 0);
            let creatureDamageDealt = 0;

            for (const blocker of liveBlockers) {
                if (remainingDamage <= 0) break;

                // Damage already marked this combat counts toward lethal damage.
                const alreadyMarked =
                    Number(blocker.damageMarked || 0) +
                    Number(damageOnBlockers.get(blocker.id) || 0);
                // With Deathtouch, 1 point of combat damage is lethal for assignment purposes.
                const lethalNeeded = hasAbility(attacker, "deathtouch")
                    ? (alreadyMarked > 0 || deathtouchOnBlockers.has(blocker.id) ? 0 : 1)
                    : Math.max(0, Number(blocker.toughness || 0) - alreadyMarked);
                const assigned = Math.min(remainingDamage, lethalNeeded || remainingDamage);
                const preventedByProtection = hasAbility(blocker, "protection_red") && String(attacker.cost || "").includes("R");
                const actualAssigned = preventedByProtection ? 0 : assigned;

                markDamage(damageOnBlockers, blocker, actualAssigned);
                creatureDamageDealt += actualAssigned;
                if (preventedByProtection && assigned > 0) {
                    messages.push(`${blocker.name} forhindrer damage fra ${attacker.name} pga. Protection from Red.`);
                }
                if (actualAssigned > 0 && hasAbility(attacker, "deathtouch")) {
                    deathtouchOnBlockers.add(blocker.id);
                }
                remainingDamage -= assigned;
            }

            // Without Trample, any remaining combat damage is still dealt to
            // the last blocker instead of disappearing. This matters for Lifelink.
            if (!hasAbility(attacker, "trample") && remainingDamage > 0 && liveBlockers.length > 0) {
                const lastBlocker = liveBlockers[liveBlockers.length - 1];
                const preventedByProtection = hasAbility(lastBlocker, "protection_red") && String(attacker.cost || "").includes("R");
                const actualRemaining = preventedByProtection ? 0 : remainingDamage;
                markDamage(damageOnBlockers, lastBlocker, actualRemaining);
                creatureDamageDealt += actualRemaining;
                if (preventedByProtection && remainingDamage > 0) {
                    messages.push(`${lastBlocker.name} forhindrer damage fra ${attacker.name} pga. Protection from Red.`);
                }
                if (actualRemaining > 0 && hasAbility(attacker, "deathtouch")) {
                    deathtouchOnBlockers.add(lastBlocker.id);
                }
                remainingDamage = 0;
            }

            applyLifelink(attacker, attackerOwner, creatureDamageDealt);

            if (hasAbility(attacker, "trample") && remainingDamage > 0) {
                defender.life -= remainingDamage;
                applyLifelink(attacker, attackerOwner, remainingDamage);
                messages.push(
                    `${attacker.name}${firstStrikeStep ? " (First Strike)" : ""} trampler over for ${remainingDamage} skade til Player ${defenderPlayer}.`
                );
            }
        }

        updateDeaths();
    };

    const combatHasFirstStrike = game.combat.attackerIds.some(attackerId => {
        const attacker = attackerOwner.creatures.find(c => c.id === attackerId);
        const blockerIds = game.combat.blockers[attackerId] || [];
        return hasAbility(attacker, "first_strike") || hasAbility(attacker, "double_strike") || blockerIds.some(id => {
            const blocker = defender.creatures.find(c => c.id === id);
            return hasAbility(blocker, "first_strike") || hasAbility(blocker, "double_strike");
        });
    });

    // First Strike and Double Strike creatures deal combat damage before ordinary creatures.
    if (combatHasFirstStrike) {
        dealDamageStep(true);
        if (deadAttackers.size || deadBlockers.size) {
            messages.push("First Strike / Double Strike damage er afgjort før normal combat damage.");
        }
    }

    // Creatures killed by First Strike never get to deal normal combat damage.
    dealDamageStep(false);

    // Add a useful blocked-combat message once per attacker.
    for (const attackerId of game.combat.attackerIds) {
        const attacker = attackerOwner.creatures.find(c => c.id === attackerId);
        const blockerIds = game.combat.blockers[attackerId] || [];
        const blockerNames = blockerIds
            .map(id => defender.creatures.find(c => c.id === id)?.name)
            .filter(Boolean);
        if (attacker && blockerNames.length) {
            messages.push(`${attacker.name} bliver blokeret af ${blockerNames.join(" + ")}.`);
        }
    }

    // Combat damage stays marked until end of turn.
    attackerOwner.creatures.forEach(creature => {
        creature.damageMarked =
            Number(creature.damageMarked || 0) +
            Number(damageOnAttackers.get(creature.id) || 0);
    });

    defender.creatures.forEach(creature => {
        creature.damageMarked =
            Number(creature.damageMarked || 0) +
            Number(damageOnBlockers.get(creature.id) || 0);
    });

    // Helpful feedback when Indestructible prevents a combat-damage death.
    [...attackerOwner.creatures, ...defender.creatures].forEach(creature => {
        if (
            hasAbility(creature, "indestructible") &&
            Number(creature.damageMarked || 0) >= Number(creature.toughness || 0)
        ) {
            messages.push(
                `${creature.name} har lethal damage, men overlever pga. Indestructible.`
            );
        }
    });

    attackerOwner.creatures
        .filter(creature => deadAttackers.has(creature.id))
        .forEach(creature => moveAttachedAurasToGraveyard(creature.id));

    defender.creatures
        .filter(creature => deadBlockers.has(creature.id))
        .forEach(creature => moveAttachedAurasToGraveyard(creature.id));

    attackerOwner.creatures
        .filter(creature => deadAttackers.has(creature.id) && !creature.isToken)
        .forEach(creature => attackerOwner.graveyard.push(creature));

    defender.creatures
        .filter(creature => deadBlockers.has(creature.id) && !creature.isToken)
        .forEach(creature => defender.graveyard.push(creature));

    attackerOwner.creatures = attackerOwner.creatures.filter(
        creature => !deadAttackers.has(creature.id)
    );

    defender.creatures = defender.creatures.filter(
        creature => !deadBlockers.has(creature.id)
    );

    // #51 / v5.5: stop visibly in End of Combat before Main Phase 2.
    enterEndCombatStep(game.currentPlayer);

    io.emit("combatResolved", {
        messages,
        deadAttackers: [...deadAttackers],
        deadBlockers: [...deadBlockers]
    });

    game.combat = {
        attackerIds: [],
        blockers: {}
    };

    checkWinner();
    sendGameState();
}


function checkWinner() {

    if (
        game.players[1].life <= 0
    ) {
        io.emit(
            "gameOver",
            {
                winner: 2
            }
        );
    }


    if (
        game.players[2].life <= 0
    ) {
        io.emit(
            "gameOver",
            {
                winner: 1
            }
        );
    }
}


// ======================================================
// SOCKET
// ======================================================

io.on(
    "connection",
    socket => {

        console.log(
            "En enhed er forbundet."
        );


        socket.emit(
            "gameState",
            getPublicGameState()
        );


        // ----------------------------------
        // PLAYER VIEW
        // ----------------------------------

        socket.on(
            "requestPlayerView",
            data => {

                sendPlayerView(
                    socket,
                    Number(data.player)
                );

            }
        );


        // ----------------------------------
        // #60 DECK SELECTION
        // ----------------------------------

        socket.on("selectDeck", data => {
            const playerNumber = Number(data.player);
            const deckId = String(data.deckId || "");
            if (game.phase !== "deck_selection" || ![1, 2].includes(playerNumber)) return;
            const selectedDeck = buildDeckById(deckId);
            if (!selectedDeck) return;
            const validation = validateDeck(selectedDeck);
            if (!validation.valid) {
                socket.emit("gameMessage", { message: `Deck kan ikke bruges: ${validation.errors.join(" ")}` });
                sendGameState();
                return;
            }

            game.selectedDecks[playerNumber] = deckId;
            io.emit("gameMessage", { message: `Player ${playerNumber} har valgt deck.` });

            if (game.selectedDecks[1] && game.selectedDecks[2]) {
                startGameFromSelectedDecks();
                io.emit("gameMessage", { message: "Begge decks er valgt. Se jeres starthånd." });
            }
            sendGameState();
        });

        // ----------------------------------
        // #39 OPENING HAND
        // ----------------------------------

        function finishOpeningHandIfReady() {
            if (game.openingHandReady[1] && game.openingHandReady[2]) {
                game.priorityPlayer = 1;
                io.emit("gameMessage", { message: "Begge spillere er klar. Player 1 starter." });
                // #41: Start turn 1 through the same turn-start pipeline as all later turns.
                // startTurn() handles untap/reset and the first-player draw exception.
                startTurn(1);
            }
        }

        socket.on("mulliganOpeningHand", data => {
            const playerNumber = Number(data.player);
            if (![1, 2].includes(playerNumber) || game.phase !== "opening_hand") return;
            if (game.openingHandReady[playerNumber] || game.pendingMulliganBottom[playerNumber] > 0) return;

            const player = game.players[playerNumber];
            // London Mulligan: return the whole hand, shuffle, then draw seven again.
            player.library.push(...player.hand);
            player.hand = [];
            shuffleDeck(player.library);
            player.hand = player.library.splice(0, 7);
            game.mulliganCount[playerNumber] += 1;

            io.emit("gameMessage", { message: `Player ${playerNumber} tager mulligan #${game.mulliganCount[playerNumber]} og trækker 7 nye kort.` });
            sendGameState();
        });

        socket.on("keepOpeningHand", data => {
            const playerNumber = Number(data.player);
            if (![1, 2].includes(playerNumber) || game.phase !== "opening_hand") return;
            if (game.openingHandReady[playerNumber] || game.pendingMulliganBottom[playerNumber] > 0) return;

            const bottoms = game.mulliganCount[playerNumber] || 0;
            if (bottoms > 0) {
                game.pendingMulliganBottom[playerNumber] = bottoms;
                io.emit("gameMessage", { message: `Player ${playerNumber} beholder hånden og skal lægge ${bottoms} kort nederst i sit Library.` });
            } else {
                game.openingHandReady[playerNumber] = true;
                io.emit("gameMessage", { message: `Player ${playerNumber} beholder sin starthånd.` });
                finishOpeningHandIfReady();
            }
            sendGameState();
        });

        socket.on("mulliganBottomCard", data => {
            const playerNumber = Number(data.player);
            if (![1, 2].includes(playerNumber) || game.phase !== "opening_hand") return;
            if (game.pendingMulliganBottom[playerNumber] <= 0) return;

            const player = game.players[playerNumber];
            const index = player.hand.findIndex(c => c.id === data.cardId);
            if (index < 0) return;
            const [chosen] = player.hand.splice(index, 1);
            // Bottom of library is the end of our library array (draws come from index 0).
            player.library.push(chosen);
            game.pendingMulliganBottom[playerNumber] -= 1;

            if (game.pendingMulliganBottom[playerNumber] === 0) {
                game.openingHandReady[playerNumber] = true;
                io.emit("gameMessage", { message: `Player ${playerNumber} har afsluttet sin mulligan og starter med ${player.hand.length} kort.` });
                finishOpeningHandIfReady();
            }
            sendGameState();
        });


        // ----------------------------------
        // PLAY CARD
        // ----------------------------------

        socket.on(
            "playCardRequest",
            data => {

                const playerNumber =
                    Number(data.player);

                const player =
                    game.players[
                        playerNumber
                    ];

                if (game.phase === "opening_hand") {
                    socket.emit("playRejected", {
                        player: playerNumber,
                        message: "Bekræft først din starthånd."
                    });
                    return;
                }

                if (game.pendingDiscard) {
                    socket.emit("playRejected", {
                        player: playerNumber,
                        message: `Player ${game.pendingDiscard.player} skal først vælge kort at discarde.`
                    });
                    return;
                }


                // Normale kort kan kun spilles af den aktive spiller i main phase.
                // Instants (v1.2: Giant Growth og Shock) kan spilles af BEGGE spillere,
                // mens blockers vælges, før combat damage bliver resolved.
                const handCard = player.hand.find(card => card.id === data.cardId);
                const isInstant = handCard && handCard.type === "spell" && handCard.speed === "instant";
                const hasFlash = handCard && handCard.type === "creature" && Array.isArray(handCard.abilities) && handCard.abilities.includes("flash");
                const instantSpeed = isInstant || hasFlash;
                const activeMainPlay =
                    playerNumber === game.currentPlayer &&
                    (game.phase === "main" || game.phase === "main2");
                // #54: Instant-speed cards may be played in every real priority window,
                // not only during blockers or as a response to an existing stack.
                const priorityInstantPlay =
                    instantSpeed &&
                    stepHasPriority() &&
                    playerNumber === game.priorityPlayer;

                const stackResponsePlay =
                    instantSpeed &&
                    game.stack.length > 0 &&
                    playerNumber === game.priorityPlayer;

                if (!activeMainPlay && !priorityInstantPlay && !stackResponsePlay) {
                    socket.emit("playRejected", {
                        player: playerNumber,
                        message: instantSpeed
                            ? "Dette kort kan spilles med instant timing, når du har priority."
                            : (playerNumber !== game.currentPlayer
                                ? `Det er Player ${game.currentPlayer}'s tur.`
                                : "Combat skal afsluttes først.")
                    });
                    return;
                }


                // #54: whenever a priority window is open, only its holder may cast.
                if (stepHasPriority() && playerNumber !== game.priorityPlayer) {
                    socket.emit("playRejected", {
                        player: playerNumber,
                        message: `Player ${game.priorityPlayer} har priority.`
                    });
                    return;
                }


                const handIndex =
                    player.hand
                        .findIndex(
                            card =>
                                card.id ===
                                data.cardId
                        );


                if (
                    handIndex === -1
                ) {
                    return;
                }


                const playedCard =
                    player.hand[
                        handIndex
                    ];


                // LAND

                if (
                    playedCard.type ===
                    "land"
                ) {

                    if (
                        player
                            .landPlayedThisTurn
                    ) {

                        socket.emit(
                            "playRejected",
                            {
                                player:
                                    playerNumber,

                                message:
                                    "Du har allerede spillet et land denne tur."
                            }
                        );

                        return;
                    }


                    player.hand.splice(
                        handIndex,
                        1
                    );


                    player.lands.push(
                        {
                            ...playedCard,

                            color:
                                getManaColor(
                                    playedCard
                                ),

                            tapped: false
                        }
                    );


                    player
                        .landPlayedThisTurn =
                        true;


                    socket.emit(
                        "playAccepted",
                        {
                            player:
                                playerNumber,

                            message:
                                `${playedCard.name} kommer på battlefieldet.`
                        }
                    );


                    sendPlayerView(
                        socket,
                        playerNumber
                    );

                    sendGameState();

                    return;
                }


                // SPELL

                if (playedCard.type === "spell" || playedCard.type === "enchantment" || playedCard.type === "artifact") {
                    const landsToTap = findLandsToPay(playerNumber, playedCard.cost);

                    if (!landsToTap) {
                        socket.emit("playRejected", {
                            player: playerNumber,
                            message: `Ikke nok mana. ${playedCard.name} koster ${playedCard.cost}.`
                        });
                        return;
                    }

                    const opponentNumber = playerNumber === 1 ? 2 : 1;
                    const target = data.target || {};
                    const isPumpSpell = playedCard.effect === "pump";
                    const isCounterSpell = playedCard.effect === "plus1_counter";
                    const isTokenSpell = playedCard.effect === "create_tokens";
                    const isAuraSpell = playedCard.effect === "aura_buff";
                    const isExileSpell = playedCard.effect === "exile_creature";
                    const isReturnSpell = playedCard.effect === "return_creature_from_graveyard";
                    const isDrawSpell = playedCard.effect === "draw_cards";
                    const isDiscardSpell = playedCard.effect === "discard_cards";
                    const isArtifactSpell = playedCard.type === "artifact";
                    const creatureOnlySpell = isPumpSpell || isCounterSpell || isAuraSpell || isExileSpell;

                    if (creatureOnlySpell) {
                        if (target.type !== "creature") {
                            socket.emit("playRejected", {
                                player: playerNumber,
                                message: `${playedCard.name} skal målrette et creature.`
                            });
                            return;
                        }
                    } else if (isTokenSpell || isArtifactSpell || isDrawSpell) {
                        // Token-spells og almindelige artifacts har ikke noget mål.
                    } else if (isReturnSpell) {
                        if (!target || target.type !== "graveyard_creature" || target.player !== playerNumber) {
                            socket.emit("actionRejected", { message: "Vælg et creature-kort i din egen graveyard." });
                            return;
                        }

                        const graveCard = player.graveyard.find(
                            c => c.id === target.id && c.type === "creature"
                        );

                        if (!graveCard) {
                            socket.emit("actionRejected", { message: "Det valgte creature-kort er ikke længere i graveyard." });
                            return;
                        }
                    } else if (isDiscardSpell) {
                        if (target.type !== "player" || Number(target.player) !== opponentNumber) {
                            socket.emit("playRejected", { player: playerNumber, message: `${playedCard.name} skal målrette modstanderen.` });
                            return;
                        }
                    } else if (target.type === "player") {
                        if (Number(target.player) !== opponentNumber) {
                            socket.emit("playRejected", { player: playerNumber, message: "Ugyldigt mål." });
                            return;
                        }
                    } else if (target.type !== "creature") {
                        socket.emit("playRejected", {
                            player: playerNumber,
                            message: `${playedCard.name} skal have et mål.`
                        });
                        return;
                    }

                    if (target.type === "creature") {
                        const ownerNumber = Number(target.player);
                        if (![1, 2].includes(ownerNumber)) {
                            socket.emit("playRejected", { player: playerNumber, message: "Ugyldigt mål." });
                            return;
                        }
                        const targetCreature = game.players[ownerNumber].creatures.find(c => c.id === target.id);
                        if (!targetCreature) {
                            socket.emit("playRejected", { player: playerNumber, message: "Målet findes ikke længere." });
                            return;
                        }

                        // v2.4: Hexproof — modstanderen må ikke targete dette creature.
                        if (ownerNumber !== playerNumber && Array.isArray(targetCreature.abilities) && targetCreature.abilities.includes("hexproof")) {
                            socket.emit("playRejected", {
                                player: playerNumber,
                                message: `${targetCreature.name} har Hexproof og kan ikke være mål for modstanderens spells.`
                            });
                            return;
                        }

                        // v2.7: Protection from Red — røde spells kan ikke targete creaturet.
                        if (ownerNumber !== playerNumber && Array.isArray(targetCreature.abilities) && targetCreature.abilities.includes("protection_red") && String(playedCard.cost || "").includes("R")) {
                            socket.emit("playRejected", {
                                player: playerNumber,
                                message: `${targetCreature.name} har Protection from Red og kan ikke være mål for en rød spell.`
                            });
                            return;
                        }

                        // v2.6: Ward 2 — modstanderens spell koster 2 ekstra mana, når dette creature targetes.
                        if (ownerNumber !== playerNumber && Array.isArray(targetCreature.abilities) && targetCreature.abilities.includes("ward_2")) {
                            const wardLands = findLandsToPay(playerNumber, "2");
                            if (!wardLands) {
                                socket.emit("playRejected", {
                                    player: playerNumber,
                                    message: `${targetCreature.name} har Ward 2. Du mangler 2 ekstra mana til Ward-prisen.`
                                });
                                return;
                            }
                            // Reserver Ward-landene sammen med spellens normale betaling uden overlap.
                            const normalIds = new Set(landsToTap.map(l => l.id));
                            const extraAvailable = game.players[playerNumber].lands.filter(l => !l.tapped && !normalIds.has(l.id));
                            if (extraAvailable.length < 2) {
                                socket.emit("playRejected", {
                                    player: playerNumber,
                                    message: `${targetCreature.name} har Ward 2. Du skal betale 2 ekstra mana.`
                                });
                                return;
                            }
                            landsToTap.push(extraAvailable[0], extraAvailable[1]);
                        }
                    }

                    // v1.3.1: spell is cast onto the stack instead of resolving immediately.
                    if (isInstant && stepHasPriority() && playerNumber !== game.priorityPlayer) {
                        socket.emit("playRejected", { player: playerNumber, message: `Player ${game.priorityPlayer} har priority.` });
                        return;
                    }

                    landsToTap.forEach(land => land.tapped = true);
                    player.hand.splice(handIndex, 1);
                    game.stack.push({ caster: playerNumber, card: playedCard, target });
                    const opponentCanRespond = offerStackResponseOrAutoResolve(playerNumber);

                    io.emit("spellCast", {
                        caster: playerNumber, card: playedCard, target,
                        message: opponentCanRespond
                            ? `${playedCard.name} er lagt på stacken. Player ${game.priorityPlayer} kan reagere.`
                            : `${playedCard.name} resolver automatisk – modstanderen havde ingen mulig reaktion.`
                    });
                    if (opponentCanRespond) sendGameState();
                    return;
                }


                // CREATURE

                // v2.8: Flash-creatures bruger stacken ligesom instants, når de
                // spilles uden for controllerens normale main phase eller som svar.
                if (hasFlash && (!activeMainPlay || game.stack.length > 0)) {
                    if (stepHasPriority() && playerNumber !== game.priorityPlayer) {
                        socket.emit("playRejected", { player: playerNumber, message: `Player ${game.priorityPlayer} har priority.` });
                        return;
                    }

                    const flashLandsToTap = findLandsToPay(playerNumber, playedCard.cost);
                    if (!flashLandsToTap) {
                        socket.emit("playRejected", { player: playerNumber, message: `Ikke nok mana. ${playedCard.name} koster ${playedCard.cost}.` });
                        return;
                    }

                    flashLandsToTap.forEach(land => land.tapped = true);
                    player.hand.splice(handIndex, 1);
                    game.stack.push({ caster: playerNumber, card: playedCard, target: null });
                    const opponentCanRespond = offerStackResponseOrAutoResolve(playerNumber);

                    io.emit("spellCast", {
                        caster: playerNumber, card: playedCard, target: null,
                        message: opponentCanRespond
                            ? `${playedCard.name} (Flash) er lagt på stacken. Player ${game.priorityPlayer} kan reagere.`
                            : `${playedCard.name} (Flash) resolver automatisk – modstanderen havde ingen mulig reaktion.`
                    });
                    if (opponentCanRespond) sendGameState();
                    return;
                }

                const landsToTap =
                    findLandsToPay(
                        playerNumber,
                        playedCard.cost
                    );


                if (!landsToTap) {

                    socket.emit(
                        "playRejected",
                        {
                            player:
                                playerNumber,

                            message:
                                `Ikke nok mana. ${playedCard.name} koster ${playedCard.cost}.`
                        }
                    );

                    return;
                }


                landsToTap.forEach(
                    land => {
                        land.tapped =
                            true;
                    }
                );


                player.hand.splice(
                    handIndex,
                    1
                );


                const creaturePermanent = {
                    ...playedCard,
                    tapped: false,
                    enteredTurn: game.turnNumber
                };

                player.creatures.push(creaturePermanent);
                const directEtbCount = queueEtbAbility(playerNumber, creaturePermanent);
                const directTriggerCount = queueCreatureEnteredTriggers(playerNumber, creaturePermanent);
                if (directEtbCount + directTriggerCount > 0) {
                    smartAdvanceStackPriority(game.currentPlayer);
                }


                socket.emit(
                    "playAccepted",
                    {
                        player:
                            playerNumber,

                        message:
                            `${playedCard.name} blev spillet for ${playedCard.cost || "0"} mana.`
                    }
                );


                sendPlayerView(
                    socket,
                    playerNumber
                );

                sendGameState();
            }
        );


        // ----------------------------------
        // START COMBAT
        // ----------------------------------

        socket.on(
            "startCombat",
            data => {

                const playerNumber =
                    Number(data.player);


                if (
                    playerNumber !==
                    game.currentPlayer
                ) {
                    return;
                }


                if (
                    game.phase !==
                    "main"
                ) {
                    return;
                }


                // #54 / v5.9.2: Clicking START COMBAT is the active player's implicit
                // priority pass. The opponent gets the response window; if they pass,
                // the engine enters Beginning of Combat automatically.
                requestSmartResponse(
                    playerNumber,
                    "start_combat",
                    `Player ${playerNumber} vil gå til Combat. Modstanderen kan reagere.`
                );
            }
        );


        // ----------------------------------
        // BEGINNING OF COMBAT -> DECLARE ATTACKERS
        // ----------------------------------

        socket.on(
            "beginDeclareAttackers",
            data => {
                const playerNumber = Number(data.player);

                if (playerNumber !== game.currentPlayer) return;
                if (game.phase !== "begin_combat") return;

                // The active player's continue click is an implicit pass in Beginning of Combat.
                requestSmartResponse(
                    playerNumber,
                    "declare_attackers",
                    `Player ${playerNumber} vil vælge angribere. Modstanderen kan reagere.`
                );
            }
        );


        // ----------------------------------
        // TOGGLE ATTACKER
        // ----------------------------------

        socket.on(
            "toggleAttacker",
            data => {

                const playerNumber =
                    Number(data.player);


                if (
                    playerNumber !==
                    game.currentPlayer
                ) {
                    return;
                }


                if (
                    game.phase !==
                    "choose_attackers"
                ) {
                    return;
                }


                const creature =
                    game.players[
                        playerNumber
                    ]
                    .creatures
                    .find(
                        creature =>
                            creature.id ===
                            data.creatureId
                    );


                if (
                    !creature ||
                    !canAttack(
                        creature
                    )
                ) {

                    const hasDefender =
                        Array.isArray(creature?.abilities) &&
                        creature.abilities.includes("defender");

                    socket.emit(
                        "actionRejected",
                        {
                            message:
                                hasDefender
                                    ? "Stone Wall har Defender og kan ikke angribe."
                                    : "Creaturet kan ikke angribe."
                        }
                    );

                    return;
                }


                const index =
                    game.combat
                        .attackerIds
                        .indexOf(
                            creature.id
                        );


                if (
                    index === -1
                ) {

                    game.combat
                        .attackerIds
                        .push(
                            creature.id
                        );

                } else {

                    game.combat
                        .attackerIds
                        .splice(
                            index,
                            1
                        );
                }


                sendGameState();
            }
        );


        // ----------------------------------
        // CONFIRM ATTACKERS
        // ----------------------------------

        socket.on(
            "confirmAttackers",
            data => {

                const playerNumber =
                    Number(data.player);


                if (
                    playerNumber !==
                    game.currentPlayer
                ) {
                    return;
                }


                if (
                    game.phase !==
                    "choose_attackers"
                ) {
                    return;
                }


                // #48: Re-check every selected attacker at declaration time.
                // This prevents stale/illegal selections from being declared.
                const attackerPlayerForValidation = game.players[playerNumber];
                game.combat.attackerIds = game.combat.attackerIds.filter(id => {
                    const creature = attackerPlayerForValidation.creatures.find(c => c.id === id);
                    return creature && canAttack(creature);
                });

                if (
                    game.combat
                        .attackerIds
                        .length === 0
                ) {
                    skipEmptyCombatToMain2(playerNumber);
                    return;
                }


                const attackerPlayer =
                    game.players[
                        playerNumber
                    ];


                game.combat
                    .attackerIds
                    .forEach(
                        id => {

                            const creature =
                                attackerPlayer
                                    .creatures
                                    .find(
                                        creature =>
                                            creature.id ===
                                            id
                                    );

                            if (creature) {
                                // Vigilance: attacking does not cause this creature to tap.
                                if (!(Array.isArray(creature.abilities) && creature.abilities.includes("vigilance"))) {
                                    creature.tapped = true;
                                }
                            }

                        }
                    );


                // #49 / v5.3: Always enter the real Declare Blockers Step.
                // Even with zero available blockers, the defending player confirms 0 blocks.
                enterDeclareBlockersStep(playerNumber);
                sendGameState();
            }
        );


        // ----------------------------------
        // ASSIGN BLOCKER
        // ----------------------------------

        socket.on(
            "assignBlocker",
            data => {

                const defenderNumber =
                    Number(data.player);

                const attackerNumber =
                    game.currentPlayer;


                if (
                    defenderNumber ===
                    attackerNumber
                ) {
                    return;
                }


                if (
                    game.phase !==
                    "choose_blockers"
                ) {
                    return;
                }


                const attackerId =
                    data.attackerId;

                const blockerId =
                    data.blockerId;


                if (
                    !game.combat
                        .attackerIds
                        .includes(
                            attackerId
                        )
                ) {
                    return;
                }


                const defender =
                    game.players[
                        defenderNumber
                    ];


                const blocker =
                    defender.creatures
                        .find(
                            creature =>
                                creature.id ===
                                blockerId
                        );


                if (
                    !blocker ||
                    blocker.tapped
                ) {
                    return;
                }

                const attacker =
                    game.players[attackerNumber]
                        .creatures
                        .find(
                            creature =>
                                creature.id ===
                                attackerId
                        );

                const attackerFlying =
                    Array.isArray(attacker?.abilities) &&
                    attacker.abilities.includes("flying");

                const blockerCanBlockFlying =
                    Array.isArray(blocker?.abilities) &&
                    (
                        blocker.abilities.includes("flying") ||
                        blocker.abilities.includes("reach")
                    );

                // v2.7: Protection from Red — en creature med protection from red kan ikke blokeres af røde creatures.
                const attackerProtectionRed =
                    Array.isArray(attacker?.abilities) && attacker.abilities.includes("protection_red");
                const blockerIsRed = String(blocker?.cost || "").includes("R");
                if (attackerProtectionRed && blockerIsRed) {
                    return;
                }

                // Flying creatures can only be blocked by Flying or Reach.
                if (
                    attackerFlying &&
                    !blockerCanBlockFlying
                ) {
                    return;
                }


                // Fjern blocker fra tidligere assignment.

                Object.keys(
                    game.combat.blockers
                ).forEach(
                    existingAttacker => {

                        game.combat.blockers[
                            existingAttacker
                        ] =
                            (
                                game.combat
                                    .blockers[
                                        existingAttacker
                                    ] || []
                            )
                            .filter(
                                id =>
                                    id !==
                                    blockerId
                            );

                    }
                );


                if (
                    !game.combat.blockers[
                        attackerId
                    ]
                ) {

                    game.combat.blockers[
                        attackerId
                    ] = [];
                }


                game.combat.blockers[
                    attackerId
                ].push(
                    blockerId
                );


                sendGameState();
            }
        );


        // ----------------------------------
        // REMOVE BLOCKER
        // ----------------------------------

        socket.on(
            "removeBlocker",
            data => {

                const defenderNumber =
                    Number(data.player);


                if (
                    defenderNumber ===
                    game.currentPlayer
                ) {
                    return;
                }


                if (
                    game.phase !==
                    "choose_blockers"
                ) {
                    return;
                }


                Object.keys(
                    game.combat.blockers
                ).forEach(
                    attackerId => {

                        game.combat.blockers[
                            attackerId
                        ] =
                            game.combat
                                .blockers[
                                    attackerId
                                ]
                                .filter(
                                    id =>
                                        id !==
                                        data.blockerId
                                );

                    }
                );


                sendGameState();
            }
        );


        // ----------------------------------
        // CONFIRM BLOCKERS
        // ----------------------------------

        socket.on(
            "confirmBlockers",
            data => {

                const defender =
                    Number(data.player);


                if (
                    defender ===
                    game.currentPlayer
                ) {
                    return;
                }


                if (
                    game.phase !==
                    "choose_blockers"
                ) {
                    return;
                }

                if (game.stack.length > 0) {
                    socket.emit("actionRejected", { message: "Stacken skal være tom før combat kan afgøres." });
                    return;
                }

                // MENACE: en angriber med Menace må ikke blokeres af præcis én creature.
                // Enten 0 blockers eller mindst 2 blockers er lovligt.
                const attackerOwner = game.players[game.currentPlayer];
                const illegalMenaceBlock = game.combat.attackerIds.find(attackerId => {
                    const attacker = attackerOwner.creatures.find(c => c.id === attackerId);
                    if (!(Array.isArray(attacker?.abilities) && attacker.abilities.includes("menace"))) {
                        return false;
                    }
                    return (game.combat.blockers[attackerId] || []).length === 1;
                });

                if (illegalMenaceBlock) {
                    const attacker = attackerOwner.creatures.find(c => c.id === illegalMenaceBlock);
                    socket.emit("actionRejected", {
                        message: `${attacker?.name || "Denne creature"} har Menace og skal blokeres af mindst 2 creatures.`
                    });
                    return;
                }

                enterCombatDamageStep(game.currentPlayer);
            }
        );


        // ----------------------------------
        // RESOLVE COMBAT DAMAGE (#50 / v5.4)
        // ----------------------------------

        socket.on(
            "resolveCombatDamage",
            data => {
                const playerNumber = Number(data.player);

                if (playerNumber !== game.currentPlayer) return;
                if (game.phase !== "combat_damage" || game.turnStep !== "combat_damage") return;
                if (game.stack.length > 0) {
                    socket.emit("actionRejected", { message: "Stacken skal være tom før combat damage kan afgøres." });
                    return;
                }

                resolveCombat();
            }
        );


        // ----------------------------------
        // END OF COMBAT (#51 / v5.5)
        // ----------------------------------

        socket.on(
            "continueFromEndCombat",
            data => {
                const playerNumber = Number(data.player);
                if (playerNumber !== game.currentPlayer) return;
                if (game.phase !== "end_combat" || game.turnStep !== "end_combat") return;
                if (game.stack.length > 0) {
                    socket.emit("actionRejected", { message: "Stacken skal være tom før Main Phase 2." });
                    return;
                }

                game.combat = { attackerIds: [], blockers: {} };
                performPostcombatMainPhase(playerNumber);
                sendGameState();
            }
        );


        // ----------------------------------
        // SKIP COMBAT
        // ----------------------------------

        socket.on(
            "skipCombat",
            data => {

                const playerNumber =
                    Number(data.player);


                if (
                    playerNumber !==
                    game.currentPlayer
                ) {
                    return;
                }


                if (
                    game.phase !==
                    "choose_attackers"
                ) {
                    return;
                }


                skipEmptyCombatToMain2(playerNumber);
            }
        );


        // ----------------------------------
        // END TURN
        // ----------------------------------

        socket.on(
            "endTurn",
            data => {

                const playerNumber =
                    Number(data.player);


                if (
                    playerNumber !==
                    game.currentPlayer
                ) {
                    return;
                }


                // v5.6.1: END TURN may only end the whole turn from Main Phase 2.
                // Phase/step transitions always use dedicated actions/buttons.
                if (game.phase !== "main2" || game.turnStep !== "main2") {
                    socket.emit(
                        "actionRejected",
                        {
                            message:
                                "END TURN kan kun bruges i Main Phase 2. Brug faseknappen for at fortsætte."
                        }
                    );
                    return;
                }


                // v5.7.2: END TURN ends the whole turn as one action.
                // The rules engine still performs End Step and Cleanup in order,
                // but the player is not forced to click through empty ending steps.
                // #54 / v5.9.2: END TURN is an implicit priority pass. Give the
                // opponent one final response window before Ending/Cleanup.
                requestSmartResponse(
                    playerNumber,
                    "end_turn",
                    `Player ${playerNumber} vil afslutte turen. Modstanderen kan reagere.`
                );
            }
        );


        // ----------------------------------
        // END STEP / CLEANUP (#53 / v5.7)
        // ----------------------------------

        socket.on("continueToCleanup", data => {
            const playerNumber = Number(data.player);
            if (playerNumber !== game.currentPlayer) return;
            if (game.phase !== "end_step" || game.turnStep !== "end_step") return;
            if (game.stack.length > 0) {
                socket.emit("actionRejected", { message: "Stacken skal være tom før Cleanup Step." });
                return;
            }
            performCleanupStep(playerNumber);
        });

        socket.on("finishCleanup", data => {
            const playerNumber = Number(data.player);
            if (playerNumber !== game.currentPlayer) return;
            if (game.phase !== "cleanup" || game.turnStep !== "cleanup") return;
            finishTurnAfterCleanup(playerNumber);
        });


        // ----------------------------------
        // RESET
        // ----------------------------------


        // ----------------------------------
        // ACTIVATED ABILITIES (#30)
        // ----------------------------------
        socket.on("activateAbility", data => {
            const playerNumber = Number(data.player);
            const player = game.players[playerNumber];
            const artifact = player?.artifacts.find(a => a.id === data.permanentId);

            if (!artifact || !artifact.activatedAbility) {
                socket.emit("actionRejected", { message: "Denne permanent har ingen activated ability." });
                return;
            }

            if (game.stack.length > 0 && playerNumber !== game.priorityPlayer) {
                socket.emit("actionRejected", { message: `Player ${game.priorityPlayer} har priority.` });
                return;
            }

            if (artifact.activatedAbility.cost === "tap") {
                if (artifact.tapped) {
                    socket.emit("actionRejected", { message: `${artifact.name} er allerede tapped.` });
                    return;
                }
                artifact.tapped = true;
            }

            if (artifact.activatedAbility.cost === "sacrifice_creature") {
                const sacrificeId = data.sacrificeId;
                const sacrificeIndex = player.creatures.findIndex(c => c.id === sacrificeId);

                if (sacrificeIndex === -1) {
                    socket.emit("actionRejected", { message: "Vælg en creature, du kontrollerer, som skal sacrifices." });
                    return;
                }

                const sacrificed = player.creatures[sacrificeIndex];

                // Sacrifice is a COST: the creature leaves immediately, before priority.
                moveAttachedAurasToGraveyard(sacrificed.id);
                player.creatures.splice(sacrificeIndex, 1);

                if (!sacrificed.isToken) {
                    player.graveyard.push(sacrificed);
                }

                io.emit("combatMessage", {
                    text: `${sacrificed.name} bliver sacrificed som cost til ${artifact.name}.`
                });
            }

            game.stack.push({
                kind: "activated_ability",
                caster: playerNumber,
                card: artifact,
                ability: { ...artifact.activatedAbility },
                target: null
            });
            // Aktivatoren må stadig holde priority, men v5.9.7 viser kun
            // vinduet hvis spilleren faktisk har endnu en lovlig handling.
            // Ellers auto-passes der videre til modstanderen / resolution.
            const stackNeedsDecision = smartAdvanceStackPriority(playerNumber);

            io.emit("spellCast", {
                caster: playerNumber,
                card: artifact,
                target: null,
                message: stackNeedsDecision
                    ? `${artifact.name}: ${artifact.activatedAbility.text} er lagt på stacken. Player ${game.priorityPlayer} kan reagere.`
                    : `${artifact.name}: ${artifact.activatedAbility.text} fortsætter automatisk – ingen havde en lovlig reaktion.`
            });
            sendGameState();
        });

        // ----------------------------------
        // PASS PRIORITY (v1.3.1)
        // ----------------------------------
        socket.on("passPriority", data => {
            const playerNumber = Number(data.player);
            if (playerNumber !== game.priorityPlayer) {
                socket.emit("actionRejected", { message: `Player ${game.priorityPlayer} har priority.` });
                return;
            }

            if (!stepHasPriority() && game.stack.length === 0) {
                socket.emit("actionRejected", { message: "Der er ikke et priority-vindue i dette step." });
                return;
            }

            game.consecutivePasses += 1;
            const otherPlayer = playerNumber === 1 ? 2 : 1;

            io.emit("gameMessage", {
                message: `Player ${playerNumber} vælger ingen reaktion.`
            });

            if (game.stack.length > 0) {
                // If the other player cannot legally react, auto-pass them too.
                // Two passes resolve the top item; any new ETB/triggered stack
                // objects then run through the same central smart-priority chain.
                if (game.consecutivePasses < 2 && hasInstantSpeedResponse(otherPlayer)) {
                    game.priorityPlayer = otherPlayer;
                    sendGameState();
                    return;
                }

                if (game.consecutivePasses < 2) {
                    io.emit("gameMessage", {
                        message: `Player ${otherPlayer} har ingen mulig reaktion og auto-passer.`
                    });
                }

                game.consecutivePasses = 0;
                resolveTopOfStack();

                if (game.stack.length > 0 && !game.pendingDiscard) {
                    smartAdvanceStackPriority(game.currentPlayer);
                } else {
                    game.priorityPlayer = game.currentPlayer;
                }

                sendGameState();
                return;
            }

            game.priorityPlayer = otherPlayer;
            if (game.consecutivePasses >= 2) {
                const transition = game.pendingPriorityTransition;
                if (transition) {
                    executePriorityTransition(transition);
                    return;
                }
                game.consecutivePasses = 0;
                game.priorityPlayer = game.currentPlayer;
            }

            sendGameState();
        });

        socket.on(
            "resetGame",
            () => {

                game =
                    createNewGame();


                io.emit(
                    "gameReset"
                );


                sendGameState();
            }
        );


        socket.on("discardCardRequest", data => {
            const playerNumber = Number(data.player);
            const pending = game.pendingDiscard;
            if (!pending || pending.player !== playerNumber) {
                socket.emit("actionRejected", { message: "Du skal ikke discarde et kort lige nu." });
                return;
            }

            const player = game.players[playerNumber];
            const index = player.hand.findIndex(c => c.id === data.cardId);
            if (index === -1) {
                socket.emit("actionRejected", { message: "Kortet findes ikke længere på hånden." });
                return;
            }

            const discarded = player.hand.splice(index, 1)[0];
            player.graveyard.push(discarded);
            pending.count -= 1;

            let text = `Player ${playerNumber} discarder ${discarded.name}.`;
            if (pending.count <= 0 || player.hand.length === 0) {
                const wasCleanupHandLimit = pending.kind === "cleanup_hand_limit";
                game.pendingDiscard = null;

                if (wasCleanupHandLimit) {
                    text += ` Hånden er nu ${player.hand.length}/7. Cleanup er færdig.`;
                    io.emit("combatMessage", { text });
                    sendGameState();
                    finishTurnAfterCleanup(playerNumber);
                    return;
                }

                text += " Discard-effekten er færdig.";
            } else {
                text += ` Vælg ${pending.count} kort mere.`;
            }

            io.emit("combatMessage", { text });
            sendGameState();
            sendPlayerView(socket, playerNumber);
        });

        socket.on(
            "disconnect",
            () => {

                console.log(
                    "En enhed blev afbrudt."
                );
            }
        );
    }
);


// ======================================================
// SERVER
// ======================================================

const PORT = process.env.PORT || 3000;

server.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log("");
        console.log(
            "================================="
        );

        console.log(
            " MAGIC GAME v6.6 KØRER!"
        );

        console.log(
            "================================="
        );

        console.log("");
        console.log(
            "Battlefield: http://localhost:3000"
        );

        console.log(
            "Telefon: http://localhost:3000/phone.html"
        );

        console.log("");
    }
);
