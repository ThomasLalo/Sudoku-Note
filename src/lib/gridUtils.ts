export interface Cell { 

    // I need a way to make this fill in the other values when the cell is created. idk if it needs to be a class or it can be done in the function


    boxNumber: number;
    positionInBox: number; // boxNumber:grid::positionInBox:box first row is 1,2,3 2nd row is 4,5,6 3rd row is 7,8,9

    isfilled:boolean;
    fillNumber?: number;
    candidates: boolean[];

    rowNumber1based: number;
    colNumber1based: number;
    rowNumber0based: number;
    colNumber0based: number;
}

export function initializeGrid(){
    const cellArray:Cell[] = [];
    const boxArray:Cell[][] = [];
    for (let boxNum = 0; boxNum < 9; boxNum++) {
        for (let cellPos = 0; cellPos < 9; cellPos++) {
            cellArray.push({
                boxNumber:boxNum + 1,
                positionInBox:cellPos + 1,
                candidates:[false,false,false,false,false,false,false,false,false],
                isfilled: false,
                rowNumber1based:oneBasedLookUpTable[boxNum][cellPos][0],
                rowNumber0based:oneBasedLookUpTable[boxNum][cellPos][0] - 1,
                colNumber1based:oneBasedLookUpTable[boxNum][cellPos][1],
                colNumber0based:oneBasedLookUpTable[boxNum][cellPos][1] - 1
            });
        }
        boxArray.push(cellArray);
    }
    return boxArray;
}

export const oneBasedLookUpTable = [
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

export const cellBorders = [
    ['border-bottom','border-right'], // 0 
    ['border-bottom','border-right'], // 1 
    ['border-bottom'], // 2
    ['border-bottom','border-right'], // 3
    ['border-bottom','border-right'], // 4
    ['border-bottom'], // 5
    ['border-right'], // 6
    ['border-right'], // 7
    [] // 8
];
export const boxBorders = [
    ['border-top', 'border-left', 'border-bottom', 'border-right'], // 0
    ['border-top', 'border-bottom', 'border-right'], // 1
    ['border-top', 'border-bottom', 'border-right'], // 2
    ['border-left', 'border-bottom', 'border-right'], // 3
    ['border-bottom', 'border-right'], // 4
    ['border-bottom', 'border-right'], // 5
    ['border-left', 'border-bottom', 'border-right'], // 6
    ['border-bottom', 'border-right'], // 7
    ['border-bottom', 'border-right'] // 8
];

export function addBorders(borderColor : string, borderVar:string, borderPositions : string[][], elementNumber: number): string {
    let returnString: string = "";
    for (let borderString of borderPositions[elementNumber]) {
        if (borderString !== '') {
            returnString += borderString + ": "+borderVar+" solid var(" + borderColor + "); "
        }
    }
    return returnString;
};