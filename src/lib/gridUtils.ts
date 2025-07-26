export interface Cell {
    boxNumber: number; // 1 based, per initializeGrid
    positionInBox: number; // 1 based -- boxNumber:grid::positionInBox:box first row is 1,2,3 2nd row is 4,5,6 3rd row is 7,8,9


    fillNumber: number | null;
    candidates: boolean[];


    rowNumber1based: number;
    colNumber1based: number;
    rowNumber0based: number;
    colNumber0based: number;


    isSelected: boolean;
    bottomNeighborSeleted: boolean;
    rightNeighborSelected: boolean;
}


export function getAdjacentCell(originCell:Cell, direction:string) {
    const gridBoxIndex = originCell.boxNumber - 1;
    const gridcellIndex = originCell.positionInBox - 1;
    const row1based = originCell.rowNumber1based;
    const col1based = originCell.colNumber1based;
    
    if (direction === "ArrowUp" ) {
        if (row1based === 1) { 
            return[gridBoxIndex, gridcellIndex];
        } else if (row1based === 4 || row1based == 7) {
            return[gridBoxIndex - 3, gridcellIndex + 6]; // go from box 4 cell 3 to box 1 cell 9, or row 4 to row 3
        } else {
            return[gridBoxIndex, gridcellIndex - 3]; // go from box 4 cell 4 to box 4 cell 1, or row 5 to row 4
        }
    }

    if (direction === "ArrowDown") {
        if (row1based === 9) {
            return[gridBoxIndex, gridcellIndex];
        } else if (row1based === 6 || row1based === 3) {
            return[gridBoxIndex + 3, gridcellIndex - 6]; // go from box 5 cell 7 to box 8 cell 1, or row 6 to row 7
        } else {
            return[gridBoxIndex, gridcellIndex + 3]; // go from box 5 cell 4 to box 5 cell 7, or row 5 to row 6
        }
    }

    if (direction === "ArrowLeft" ) {
        if (col1based === 1) { 
            return[gridBoxIndex, gridcellIndex];
        } else if (col1based === 4 || col1based == 7) {
            return[gridBoxIndex - 1, gridcellIndex + 2]; // go from box 5 cell 4 to box 4 cell 6, or col 4 to col 3
        } else {
            return[gridBoxIndex, gridcellIndex - 1]; // go from box 5 cell 3 to box 5 cell 2, or col 6 to col 5
        }
    }

    if (direction === "ArrowRight" ) {
        if (col1based === 9) { 
            return[gridBoxIndex, gridcellIndex];
        } else if (col1based === 6 || col1based == 3) {
            return[gridBoxIndex + 1, gridcellIndex - 2]; // go from box 4 cell 3 to box 5 cell 1, or col 3 to col 4
        } else {
            return[gridBoxIndex, gridcellIndex + 1]; // go from box 5 cell 8 to box 5 cell 9, or col 5 to col 6
        }
    }

    return[gridBoxIndex, gridcellIndex]; // if key is something else
}

export function initializeGrid(){
    const boxArray:Cell[][] = [];
    for (let boxNum = 0; boxNum < 9; boxNum++) {
        const cellArray:Cell[] = [];
        for (let cellPos = 0; cellPos < 9; cellPos++) {
            cellArray.push({
                boxNumber:boxNum + 1,
                positionInBox:cellPos + 1,
                candidates:[true,true,true,true,true,true,true,true,true],
                fillNumber: null,
                rowNumber1based:oneBasedLookUpTable[boxNum][cellPos][0],
                rowNumber0based:oneBasedLookUpTable[boxNum][cellPos][0] - 1,
                colNumber1based:oneBasedLookUpTable[boxNum][cellPos][1],
                colNumber0based:oneBasedLookUpTable[boxNum][cellPos][1] - 1,
                isSelected: false,
                bottomNeighborSeleted: false,
                rightNeighborSelected: false
            });
        }
        boxArray.push(cellArray);
    }
    return boxArray;
}

export const oneBasedLookUpTable = [ // could I have done this with an algorithm? yeah, but it would have taken me more time to write
    [[1,1],[1,2],[1,3],
    [2,1],[2,2],[2,3],
    [3,1],[3,2],[3,3]], //box 1

    [[1,4],[1,5],[1,6],
    [2,4],[2,5],[2,6],
    [3,4],[3,5],[3,6]], //box 2

    [[1,7],[1,8],[1,9],
    [2,7],[2,8],[2,9],
    [3,7],[3,8],[3,9]], //box 3

    [[4,1],[4,2],[4,3],
    [5,1],[5,2],[5,3],
    [6,1],[6,2],[6,3]], //box 4

    [[4,4],[4,5],[4,6],
    [5,4],[5,5],[5,6],
    [6,4],[6,5],[6,6]], //box 5

    [[4,7],[4,8],[4,9],
    [5,7],[5,8],[5,9],
    [6,7],[6,8],[6,9]], //box 6

    [[7,1],[7,2],[7,3],
    [8,1],[8,2],[8,3],
    [9,1],[9,2],[9,3]], //box 7

    [[7,4],[7,5],[7,6],
    [8,4],[8,5],[8,6],
    [9,4],[9,5],[9,6]], //box 8

    [[7,7],[7,8],[7,9],
    [8,7],[8,8],[8,9],
    [9,7],[9,8],[9,9]]  //box 9  
];