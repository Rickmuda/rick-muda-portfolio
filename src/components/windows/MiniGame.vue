<template>
  <div class="solitaire-window">
    <div class="solitaire-header">
      <h2>Solitaire</h2>
      <div class="header-actions">
        <button @click="newGame">New Game</button>
        <button @click="drawStock">Draw</button>
      </div>
    </div>

    <div class="top-row">
      <div class="stock-waste">
        <button class="pile stock" @click="drawStock">
          {{ stock.length ? `Stock (${stock.length})` : 'Recycle' }}
        </button>

        <button
          class="pile waste"
          :class="{ selected: selected?.type === 'waste' }"
          @click="selectWaste"
          :disabled="!waste.length"
        >
          <span v-if="waste.length">{{ cardLabel(waste[waste.length - 1]) }}</span>
          <span v-else>Waste</span>
        </button>
      </div>

      <div class="foundations">
        <button
          v-for="suit in suits"
          :key="suit"
          class="pile foundation"
          @click="moveToFoundation(suit)"
        >
          <span v-if="foundations[suit].length">{{ cardLabel(foundations[suit][foundations[suit].length - 1]) }}</span>
          <span v-else>{{ suitSymbol(suit) }}</span>
        </button>
      </div>
    </div>

    <div class="tableau-row">
      <div
        v-for="(pile, pileIndex) in tableau"
        :key="pileIndex"
        class="tableau-pile"
        @click="moveToTableau(pileIndex)"
      >
        <div
          v-for="(card, cardIndex) in pile"
          :key="card.id"
          class="card"
          :class="{
            hidden: !card.faceUp,
            red: card.color === 'red',
            selected: isSelectedTableauCard(pileIndex, cardIndex)
          }"
          :style="{ top: `${cardIndex * 24}px` }"
          @click.stop="selectTableauCard(pileIndex, cardIndex)"
        >
          <span v-if="card.faceUp">{{ cardLabel(card) }}</span>
        </div>
      </div>
    </div>

    <p v-if="isWon" class="win-message">You won 🎉</p>
  </div>
</template>

<script>
const SUITS = ["hearts", "diamonds", "clubs", "spades"];

export default {
  data() {
    return {
      suits: SUITS,
      stock: [],
      waste: [],
      foundations: {
        hearts: [],
        diamonds: [],
        clubs: [],
        spades: [],
      },
      tableau: [[], [], [], [], [], [], []],
      selected: null,
    };
  },
  computed: {
    isWon() {
      return SUITS.every((suit) => this.foundations[suit].length === 13);
    },
  },
  methods: {
    newGame() {
      const deck = this.shuffleDeck(this.createDeck());
      this.stock = [];
      this.waste = [];
      this.foundations = {
        hearts: [],
        diamonds: [],
        clubs: [],
        spades: [],
      };
      this.tableau = [[], [], [], [], [], [], []];
      this.selected = null;

      for (let pileIndex = 0; pileIndex < 7; pileIndex++) {
        for (let cardIndex = 0; cardIndex <= pileIndex; cardIndex++) {
          const card = deck.pop();
          card.faceUp = cardIndex === pileIndex;
          this.tableau[pileIndex].push(card);
        }
      }

      this.stock = deck.map((card) => ({ ...card, faceUp: false }));
    },
    createDeck() {
      const cards = [];
      let id = 0;
      for (const suit of SUITS) {
        for (let rank = 1; rank <= 13; rank++) {
          cards.push({
            id: id++,
            suit,
            rank,
            color: suit === "hearts" || suit === "diamonds" ? "red" : "black",
            faceUp: false,
          });
        }
      }
      return cards;
    },
    shuffleDeck(cards) {
      for (let index = cards.length - 1; index > 0; index--) {
        const target = Math.floor(Math.random() * (index + 1));
        [cards[index], cards[target]] = [cards[target], cards[index]];
      }
      return cards;
    },
    drawStock() {
      this.selected = null;
      if (!this.stock.length) {
        this.stock = this.waste
          .slice()
          .reverse()
          .map((card) => ({ ...card, faceUp: false }));
        this.waste = [];
        return;
      }

      const card = this.stock.pop();
      card.faceUp = true;
      this.waste.push(card);
    },
    selectWaste() {
      if (!this.waste.length) return;
      this.selected = { type: "waste" };
    },
    selectTableauCard(pileIndex, cardIndex) {
      const pile = this.tableau[pileIndex];
      const card = pile[cardIndex];

      if (!card.faceUp) {
        if (cardIndex === pile.length - 1) {
          card.faceUp = true;
        }
        return;
      }

      this.selected = { type: "tableau", pileIndex, cardIndex };
    },
    moveToFoundation(suit) {
      if (!this.selected) return;

      const card = this.getSelectedCard();
      if (!card || card.suit !== suit) return;
      if (!this.canPlaceOnFoundation(card, suit)) return;

      if (this.selected.type === "waste") {
        this.foundations[suit].push(this.waste.pop());
      } else {
        const pile = this.tableau[this.selected.pileIndex];
        if (this.selected.cardIndex !== pile.length - 1) return;
        this.foundations[suit].push(pile.pop());
        this.revealLastTableauCard(this.selected.pileIndex);
      }

      this.selected = null;
    },
    moveToTableau(targetPileIndex) {
      if (!this.selected) return;

      const targetPile = this.tableau[targetPileIndex];
      const movingCard = this.getSelectedCard();
      if (!movingCard || !this.canPlaceOnTableau(movingCard, targetPile)) return;

      if (this.selected.type === "waste") {
        targetPile.push(this.waste.pop());
      } else {
        const sourcePile = this.tableau[this.selected.pileIndex];
        const movingCards = sourcePile.splice(this.selected.cardIndex);
        this.tableau[targetPileIndex].push(...movingCards);
        this.revealLastTableauCard(this.selected.pileIndex);
      }

      this.selected = null;
    },
    getSelectedCard() {
      if (!this.selected) return null;
      if (this.selected.type === "waste") {
        return this.waste[this.waste.length - 1] || null;
      }

      const pile = this.tableau[this.selected.pileIndex];
      return pile[this.selected.cardIndex] || null;
    },
    canPlaceOnFoundation(card, suit) {
      const foundationPile = this.foundations[suit];
      if (!foundationPile.length) {
        return card.rank === 1;
      }
      return foundationPile[foundationPile.length - 1].rank + 1 === card.rank;
    },
    canPlaceOnTableau(card, targetPile) {
      if (!targetPile.length) {
        return card.rank === 13;
      }

      const top = targetPile[targetPile.length - 1];
      if (!top.faceUp) return false;
      return top.color !== card.color && top.rank === card.rank + 1;
    },
    revealLastTableauCard(pileIndex) {
      const pile = this.tableau[pileIndex];
      if (pile.length && !pile[pile.length - 1].faceUp) {
        pile[pile.length - 1].faceUp = true;
      }
    },
    cardLabel(card) {
      if (!card) return "";
      const rankLabel =
        card.rank === 1
          ? "A"
          : card.rank === 11
            ? "J"
            : card.rank === 12
              ? "Q"
              : card.rank === 13
                ? "K"
                : String(card.rank);
      return `${rankLabel}${this.suitSymbol(card.suit)}`;
    },
    suitSymbol(suit) {
      if (suit === "hearts") return "♥";
      if (suit === "diamonds") return "♦";
      if (suit === "clubs") return "♣";
      return "♠";
    },
    isSelectedTableauCard(pileIndex, cardIndex) {
      return (
        this.selected &&
        this.selected.type === "tableau" &&
        this.selected.pileIndex === pileIndex &&
        this.selected.cardIndex === cardIndex
      );
    },
  },
  mounted() {
    this.newGame();
  },
};
</script>

<style scoped>
.solitaire-window {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px;
  background: linear-gradient(180deg, #276b2d, #1d5b24);
  color: #fff;
  border: 2px solid #000;
}

.solitaire-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.header-actions button,
.pile {
  background: #9b20b7;
  border: 1px solid #4f115d;
  color: #fff;
  border-radius: 6px;
  padding: 6px 10px;
  cursor: pointer;
  font-family: inherit;
}

.top-row {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.stock-waste,
.foundations {
  display: flex;
  gap: 8px;
}

.pile {
  min-width: 92px;
  min-height: 44px;
}

.waste.selected {
  box-shadow: 0 0 0 2px #fff inset;
}

.tableau-row {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(7, minmax(90px, 1fr));
  gap: 10px;
}

.tableau-pile {
  position: relative;
  min-height: 340px;
  border: 1px dashed rgba(255, 255, 255, 0.5);
  border-radius: 6px;
}

.card {
  position: absolute;
  left: 6px;
  right: 6px;
  height: 70px;
  background: #f7f7f7;
  color: #111;
  border: 1px solid #111;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  cursor: pointer;
}

.card.red {
  color: #b10000;
}

.card.hidden {
  background: #5b0f6f;
  border-color: #2a0734;
  color: transparent;
  cursor: default;
}

.card.selected {
  outline: 2px solid #9b20b7;
  outline-offset: 1px;
}

.win-message {
  text-align: center;
  font-size: 18px;
  font-weight: bold;
}

@media (max-width: 1000px) {
  .tableau-row {
    overflow-x: auto;
    display: flex;
  }

  .tableau-pile {
    min-width: 92px;
  }
}
</style>
