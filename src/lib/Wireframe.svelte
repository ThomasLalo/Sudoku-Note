
<div class="box-container">
    <div class="isometric-box">
        <div class="square-outline"></div>
        <!-- <div class="diagonal-line top-left"></div> -->
        <div class="diagonal-line top-right"></div>
        <div class="diagonal-line bottom-left"></div>
        <div class="diagonal-line bottom-right"></div>
        <div class="horizontal-line"></div>
        <div class="vertical-line"></div>
    </div>
</div>


<style>
    .box-container {
        display: flex;
        height: 90vmin;
        align-items: center;
        justify-content: center;
        --box-width: 100px;
        --box-height: 100px;
        --diagonal-length: 30px;
        --line-thickness: 2px;
        --diagonal-bounding-box-width: calc( -1 * (
            var(--diagonal-length) * 707/1000 + 
            var(--line-thickness) * 707/1000
        ));
    }
    /* magic number for cos(45) is 707/1000 */

    .isometric-box {
        position: relative;
        width: var(--box-width);
        height: var(--box-height);
        background-color: #f0f0f0;
    }

    .diagonal-line {
        position: absolute;
        width: var(--diagonal-length);
        height: var(--line-thickness);
        background-color: black;
    }

    .horizontal-line {
        position: absolute;
        height: var(--box-height);
        width: var(--line-thickness);
        background-color: black;
        right: var(--diagonal-bounding-box-width);
        bottom: var(--diagonal-bounding-box-width);
    }

    .vertical-line {
        position: absolute;
        height: var(--line-thickness);
        width: var(--box-width);
        background-color: black;
        bottom: var(--diagonal-bounding-box-width);
        right: var(--diagonal-bounding-box-width);
    }

    /* .diagonal-line.top-left {
        top: 0;
        left: 0;
        transform-origin: 0 0;
        transform: rotate(45deg);
    } */

    .diagonal-line.top-right {
        top: 1.5px;
        right: 1.5px;
        transform-origin: 100% 0;
        transform: rotate(225deg);
    }

    .diagonal-line.bottom-left {
        bottom: 0;
        left: 0;
        transform-origin: 0 100%;
        transform: rotate(45deg);
    }

    .diagonal-line.bottom-right {
        bottom: 1.5px;
        right: 0;
        transform-origin: 100% 100%;
        transform: rotate(225deg);
    }

    
    /* Square outline */
    .square-outline {
        position: absolute;
        width: 100px;
        height: 100px;
        border: 2px solid black;
        box-sizing: border-box;
    }
</style>