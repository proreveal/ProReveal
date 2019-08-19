let svg: SVGSVGElement, textNode: SVGTextElement;

export function measure(label: string, fontSize: string = '1rem') {
    if(!svg) {
        svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        textNode = document.createElementNS("http://www.w3.org/2000/svg", "text");
        svg.appendChild(textNode);
        document.querySelector('body').appendChild(svg);
        svg.style.visibility = 'hidden';
        svg.style.position = 'absolute';
        svg.style.zIndex = '-1';
        svg.style.top = '-5000';
    }

    textNode.style.fontSize = fontSize;
    textNode.innerHTML = label;
    return textNode.getBBox();
}
