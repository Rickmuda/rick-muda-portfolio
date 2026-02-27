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

        <div class="waste-area">
          <div
            v-if="waste.length"
            class="card waste-card"
            :class="{ 
              selected: selected?.type === 'waste',
              red: waste[waste.length - 1].color === 'red'
            }"
            draggable="true"
            @click="selectWaste"
            @dragstart="onDragStart($event, 'waste')"
            @dragend="onDragEnd"
          >
            {{ cardLabel(waste[waste.length - 1]) }}
          </div>
          <div v-else class="pile waste-empty">Waste</div>
        </div>
      </div>

      <div class="foundations">
        <div
          v-for="suit in suits"
          :key="suit"
          class="pile foundation"
          @click="moveToFoundation(suit)"
          @dragover.prevent
          @drop="onDropFoundation($event, suit)"
        >
          <span v-if="foundations[suit].length">{{ cardLabel(foundations[suit][foundations[suit].length - 1]) }}</span>
          <span v-else>{{ suitSymbol(suit) }}</span>
        </div>
      </div>
    </div>

    <div class="tableau-row">
      <div
        v-for="(pile, pileIndex) in tableau"
        :key="pileIndex"
        class="tableau-pile"
        @click="moveToTableau(pileIndex)"
        @dragover.prevent
        @drop="onDropTableau($event, pileIndex)"
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
          :draggable="card.faceUp"
          @click.stop="selectTableauCard(pileIndex, cardIndex)"
          @dragstart="card.faceUp && onDragStart($event, 'tableau', pileIndex, cardIndex)"
          @dragend="onDragEnd"
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
      dragging: null,
    };
  },
  computed: {
    isWon() {
      return SUITS.every((suit) => this.foundations[suit].length === 13);
    },
  },
  created() {
    this.newGame();
  },
  methods: {
    newGame() {
      const deck = this.createDeck();
      this.shuffle(deck);

      this.foundations = { hearts: [], diamonds: [], clubs: [], spades: [] };
      this.tableau = [[], [], [], [], [], [], []];
      this.waste = [];
      this.selected = null;

      let cardIndex = 0;
      for (let i = 0; i < 7; i++) {
        for (let j = i; j < 7; j++) {
          const card = deck[cardIndex++];
          card.faceUp = j === i;
          this.tableau[j].push(card);
        }
      }
      this.stock = deck.slice(cardIndex);
    },
    createDeck() {
      const values = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
      const deck = [];
      let id = 0;
      for (const suit of SUITS) {
        for (const value of values) {
          deck.push({
            id: id++,
            suit,
            value,
            color: suit === "hearts" || suit === "diamonds" ? "red" : "black",
            faceUp: false,
          });
        }
      }
      return deck;
    },
    shuffle(array) {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
    },
    drawStock() {
      if (this.stock.length === 0) {
        this.stock = this.waste.reverse().map((c) => ({ ...c, faceUp: false }));
        this.waste = [];
      } else {
        const card = this.stock.pop();
        card.faceUp = true;
        this.waste.push(card);
      }
      this.selected = null;
    },
    selectWaste() {
      if (this.waste.length) {
        this.selected = { type: "waste" };
      }
    },
    selectTableauCard(pileIndex, cardIndex) {
      const card = this.tableau[pileIndex][cardIndex];
      if (!card.faceUp) return;
      this.selected = { type: "tableau", pileIndex, cardIndex };
    },
    isSelectedTableauCard(pileIndex, cardIndex) {
      if (!this.selected || this.selected.type !== "tableau") return false;
      return (
        this.selected.pileIndex === pileIndex && this.selected.cardIndex <= cardIndex
      );
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
      if (!movingCard) return;
      if (!this.canPlaceOnTableau(movingCard, targetPile)) return;

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
      const foundation = this.foundations[suit];
      if (foundation.length === 0) return card.value === "A";
      const topCard = foundation[foundation.length - 1];
      return this.getValueIndex(card.value) === this.getValueIndex(topCard.value) + 1;
    },
    canPlaceOnTableau(card, pile) {
      if (pile.length === 0) return card.value === "K";
      const topCard = pile[pile.length - 1];
      if (!topCard.faceUp) return false;
      const colorMatch = card.color !== topCard.color;
      const valueMatch = this.getValueIndex(card.value) === this.getValueIndex(topCard.value) - 1;
      return colorMatch && valueMatch;
    },
    getValueIndex(value) {
      const values = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
      return values.indexOf(value);
    },
    revealLastTableauCard(pileIndex) {
      const pile = this.tableau[pileIndex];
      if (pile.length > 0) {
        pile[pile.length - 1].faceUp = true;
      }
    },
    cardLabel(card) {
      return `${card.value}${this.suitSymbol(card.suit)}`;
    },
    suitSymbol(suit) {
      const symbols = { hearts: "♥", diamonds: "♦", clubs: "♣", spades: "♠" };
      return symbols[suit];
    },
    onDragStart(event, type, pileIndex = null, cardIndex = null) {
      this.dragging = { type, pileIndex, cardIndex };
      this.selected = { type, pileIndex, cardIndex };
      event.dataTransfer.effectAllowed = 'move';
    },
    onDragEnd() {
      this.dragging = null;
    },
    onDropTableau(event, targetPileIndex) {
      if (!this.dragging) return;
      
      const targetPile = this.tableau[targetPileIndex];
      const movingCard = this.getDraggingCard();
      if (!movingCard || !this.canPlaceOnTableau(movingCard, targetPile)) return;

      if (this.dragging.type === "waste") {
        targetPile.push(this.waste.pop());
      } else {
        const sourcePile = this.tableau[this.dragging.pileIndex];
        const movingCards = sourcePile.splice(this.dragging.cardIndex);
        this.tableau[targetPileIndex].push(...movingCards);
        this.revealLastTableauCard(this.dragging.pileIndex);
      }

      this.selected = null;
      this.dragging = null;
    },
    onDropFoundation(event, suit) {
      if (!this.dragging) return;

      const card = this.getDraggingCard();
      if (!card || card.suit !== suit) return;
      if (!this.canPlaceOnFoundation(card, suit)) return;

      if (this.dragging.type === "waste") {
        this.foundations[suit].push(this.waste.pop());
      } else {
        const pile = this.tableau[this.dragging.pileIndex];
        if (this.dragging.cardIndex !== pile.length - 1) return;
        this.foundations[suit].push(pile.pop());
        this.revealLastTableauCard(this.dragging.pileIndex);
      }

      this.selected = null;
      this.dragging = null;
    },
    getDraggingCard() {
      if (!this.dragging) return null;
      if (this.dragging.type === "waste") {
        return this.waste[this.waste.length - 1] || null;
      }
      const pile = this.tableau[this.dragging.pileIndex];
      return pile[this.dragging.cardIndex] || null;
    },
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
  align-items: flex-start;
}

.pile {
  min-width: 92px;
  min-height: 70px;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.waste-area {
  min-width: 92px;
  min-height: 70px;
  display: flex;
  align-items: flex-start;
}

.waste-card {
  position: relative;
  width: 92px;
  height: 70px;
  background: #f7f7f7;
  color: #111;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 20px;
  text-shadow: none;
  cursor: grab;
  box-shadow: 0 2px 4px rgba(0,0,0,0.3);
}

.waste-card:active {
  cursor: grabbing;
}

.waste-card.red {
  color: #b10000;
}

.waste-card.selected {
  outline: 2px solid #fff;
  outline-offset: 1px;
}

.waste-empty {
  min-width: 92px;
  min-height: 70px;
  background: #9b20b7;
  border: 1px solid #4f115d;
  color: #fff;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

.waste.selected {
  box-shadow: 0 0 0 2px #fff inset;
}

.foundation {
  background: rgba(155, 32, 183, 0.5);
  border: 2px dashed rgba(255, 255, 255, 0.5);
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
  border: none;
  border-radius: 4px;
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
  padding: 4px 8px;
  font-weight: bold;
  font-size: 20px;
  text-shadow: none;
  cursor: grab;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
}

.card:active {
  cursor: grabbing;
}

.card.red {
  color: #b10000;
}

.card.hidden {
  background: #5b0f6f;
  border-color: #2a0734;
  color: transparent;
  cursor: default;
  box-shadow: none;
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
