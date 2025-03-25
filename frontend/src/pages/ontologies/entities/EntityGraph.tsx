import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import Entity from "../../../model/Entity";
import { useOntologyGraph } from "../../../app/hooks";
import ForceGraph2D from "react-force-graph-2d";
import { useNavigate } from "react-router-dom";
import * as d3 from 'd3-force';

export default function EntityGraph({
                                      ontologyId,
                                      selectedEntity,
                                      entityType,
                                      onNodeSelect
                                    }) {
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const graphRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [hoveredNode, setHoveredNode] = useState(null);
  const [relationshipFilters, setRelationshipFilters] = useState({});

  // Fetch graph data using the hook
  const { graphData: rawData, loading, error } = useOntologyGraph(
      ontologyId,
      selectedEntity?.getIri()
  );

  // Update dimensions when container size changes
  useEffect(() => {
    if (!containerRef.current) return;

    const updateDimensions = () => {
      if (containerRef.current) {
        const {width, height} = containerRef.current.getBoundingClientRect();
        setDimensions({width, height});
      }
    };

    updateDimensions();

    const observer = new ResizeObserver(updateDimensions);
    observer.observe(containerRef.current);

    return () => {
      if (containerRef.current) {
        observer.unobserve(containerRef.current);
      }
    };
  }, []);

  // Generate distinct colors for relationships
  const generateColor = (index, total) => {
    // Use a high-contrast color palette with clearly distinguishable colors
    const distinctColors = [
      '#e41a1c', // red
      '#377eb8', // blue
      '#4daf4a', // green
      '#984ea3', // purple
      '#ff7f00', // orange
      '#ffff33', // yellow
      '#a65628', // brown
      '#f781bf', // pink
      '#1b9e77', // teal
      '#d95f02', // rust
      '#7570b3', // slate blue
      '#e7298a', // magenta
      '#66a61e', // lime green
      '#e6ab02', // amber
      '#a6761d', // dark tan
      '#666666'  // dark gray
    ];

    // For more than 16 relationships, generate additional colors with HSL spread
    if (index < distinctColors.length) {
      return distinctColors[index];
    } else {
      // For additional colors, use HSL with maximum separation
      const hue = (index * 137.5) % 360; // golden ratio to spread hues evenly
      const saturation = 75 + (index % 3) * 5; // high saturation for distinctiveness
      const lightness = 45 + (index % 4) * 5; // mid-range lightness for visibility
      return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    }
  };

  // Toggle single relationship visibility
  const toggleRelationship = useCallback((relationshipType) => {
    setRelationshipFilters(prev => ({
      ...prev,
      [relationshipType]: {
        ...prev[relationshipType],
        visible: !prev[relationshipType].visible
      }
    }));
  }, []);

  // Handle the "show all / hide all" toggle
  const toggleAllRelationships = useCallback((showAll) => {
    setRelationshipFilters(prev => {
      const updated = {};
      Object.entries(prev).forEach(([key, value]) => {
        updated[key] = {...value, visible: showAll};
      });
      return updated;
    });
  }, []);

  // Process the graph data for visualization
  const {graphData, relationshipTypes} = useMemo(() => {
    if (!rawData || !rawData.nodes || !rawData.edges) {
      return {graphData: {nodes: [], links: []}, relationshipTypes: {}};
    }

    // Create a map to deduplicate edges
    const uniqueEdges = new Map();

    // Process edges to keep only unique combinations of source, target, and relationship type
    rawData.edges.forEach(edge => {
      const label = edge.label || 'unlabeled';
      const edgeKey = `${edge.source}|${edge.target}|${label}`;

      // Only keep the first instance of each unique edge
      if (!uniqueEdges.has(edgeKey)) {
        uniqueEdges.set(edgeKey, edge);
      }
    });

    // Convert unique edges back to array
    const deduplicatedEdges = Array.from(uniqueEdges.values());

    // Extract and count unique relationship types
    const relationTypes = {};
    deduplicatedEdges.forEach(edge => {
      const label = edge.label || 'unlabeled';
      if (!relationTypes[label]) {
        relationTypes[label] = {
          count: 1,
          // By default, no relationships are selected
          visible: relationshipFilters[label]?.visible ?? false
        };
      } else {
        relationTypes[label].count += 1;
      }
    });

    // Assign colors to relationship types
    const relationTypeArray = Object.keys(relationTypes);
    relationTypeArray.forEach((type, index) => {
      relationTypes[type].color = relationshipFilters[type]?.color ||
          generateColor(index, relationTypeArray.length);
    });

    // Update relationship filters with new data
    if (JSON.stringify(relationTypes) !== JSON.stringify(relationshipFilters)) {
      setRelationshipFilters(relationTypes);
    }

    // Create nodes with consistent properties
    const nodes = rawData.nodes.map(node => ({
      id: node.iri,
      label: node.label || node.iri.split('/').pop() || node.iri.split('#').pop() || node.iri,
      isSelected: selectedEntity?.getIri() === node.iri,
      isObsolete: node.is_obsolete || false,
      originalNode: node
    }));

    // Track multiple edges between the same node pairs (but not duplicates)
    const edgeCounts = {};
    const bidirectionalPairs = new Map();

    // First pass: count how many edges exist between each node pair (in each direction)
    deduplicatedEdges.forEach(edge => {
      // Create directional keys
      const forwardKey = `${edge.source}|${edge.target}`;
      const reverseKey = `${edge.target}|${edge.source}`;

      // Create a normalized key that's the same regardless of source/target order
      const nodeIds = [edge.source, edge.target].sort();
      const normalizedKey = `${nodeIds[0]}|${nodeIds[1]}`;

      // Track directional counts
      if (!edgeCounts[forwardKey]) {
        edgeCounts[forwardKey] = 1;
      } else {
        edgeCounts[forwardKey]++;
      }

      // Check for bidirectional edges
      const hasBidirectional = deduplicatedEdges.some(e =>
          e.source === edge.target && e.target === edge.source
      );

      // Store bidirectional information
      if (hasBidirectional) {
        if (!bidirectionalPairs.has(normalizedKey)) {
          bidirectionalPairs.set(normalizedKey, true);
        }
      }
    });

    // Create links with relationship colors and curvature
    const links = deduplicatedEdges.map((edge, index) => {
      const type = edge.label || 'unlabeled';

      // Get directional key
      const directionalKey = `${edge.source}|${edge.target}`;

      // Get normalized key (direction-agnostic)
      const nodeIds = [edge.source, edge.target].sort();
      const normalizedKey = `${nodeIds[0]}|${nodeIds[1]}`;

      // Get number of edges in this specific direction
      const directionalCount = edgeCounts[directionalKey] || 0;

      // Determine if we have a bidirectional relationship for these nodes
      const isBidirectional = bidirectionalPairs.has(normalizedKey);

      // Start with no curvature (straight line)
      let curvature = 0;

      // Only add curvature in two cases:
      // 1. Multiple edges in the same direction
      // 2. Bidirectional relationship
      if (directionalCount > 1) {
        // For multiple edges in the same direction, calculate distinct curvatures
        const edgeIndex = deduplicatedEdges.findIndex(e =>
            e.source === edge.source &&
            e.target === edge.target &&
            e.label === edge.label
        );

        // Spacing between multiple edges
        const curveStep = 0.2;
        const initialCurve = 0.15;

        // Calculate different curvature for each edge
        curvature = initialCurve + (edgeIndex % directionalCount) * curveStep;
      } else if (isBidirectional) {
        // For bidirectional edges, make them curve in opposite directions
        // Consistent direction based on node IDs to ensure opposite curves
        const direction = edge.source < edge.target ? 1 : -1;
        curvature = 0.2 * direction;
      }

      return {
        source: edge.source,
        target: edge.target,
        label: type,
        color: relationTypes[type]?.color || '#aaaaaa',
        visible: relationTypes[type]?.visible ?? false,
        curvature: curvature
      };
    });

    // Filter visible links
    const visibleLinks = links.filter(link => link.visible);

    // Get nodes connected by visible links
    const nodesInVisibleLinks = new Set();
    visibleLinks.forEach(link => {
      nodesInVisibleLinks.add(typeof link.source === 'object' ? link.source.id : link.source);
      nodesInVisibleLinks.add(typeof link.target === 'object' ? link.target.id : link.target);
    });

    // Filter nodes to only include those in visible links (plus the selected node)
    const selectedNodeId = selectedEntity?.getIri();
    const visibleNodes = nodes.filter(node =>
        nodesInVisibleLinks.has(node.id) || (selectedNodeId && node.id === selectedNodeId)
    );

    return {
      graphData: {nodes: visibleNodes, links: visibleLinks},
      relationshipTypes: relationTypes
    };
  }, [rawData, relationshipFilters, selectedEntity]);

  // Node click handler - update selected entity in details panel
  const handleNodeClick = useCallback((node) => {
    const iri = node.id;

    // Notify parent component about node selection
    if (onNodeSelect) {
      onNodeSelect(iri);
    }
  }, [onNodeSelect]);

  // Draw nodes with labels inside
  const paintNode = useCallback((node, ctx, globalScale) => {
    const {x, y, label, isSelected, isObsolete} = node;
    const isHovered = hoveredNode === node;

    // Store node dimensions for hit detection and link connections
    const fontSize = isHovered ? 12 : 11;
    ctx.font = `${isHovered ? 'bold ' : ''}${fontSize}px Arial`;

    // Limit label length
    let displayLabel = label;
    if (displayLabel.length > 25) {
      displayLabel = displayLabel.substring(0, 22) + '...';
    }

    // Calculate node dimensions
    const textWidth = Math.max(ctx.measureText(displayLabel).width, 40);
    const padding = 10;
    const rectWidth = textWidth + padding * 2;
    const rectHeight = fontSize + padding * 2;

    // Store dimensions in node object for link calculation and hit detection
    node.__bckgDimensions = [rectWidth, rectHeight];

    // Determine node color based on its links and status
    let nodeColor = '#7c93c7'; // Default blue

    // Center/selected node is gold
    if (isSelected) {
      nodeColor = '#FFD700';
    }
    // Obsolete nodes are red
    else if (isObsolete) {
      nodeColor = '#f44336';
    }
    // Otherwise, use the color of its first relationship
    else {
      const nodeLinks = graphData.links.filter(link => {
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
        return sourceId === node.id || targetId === node.id;
      });

      if (nodeLinks.length > 0) {
        nodeColor = nodeLinks[0].color;
      }
    }

    // Apply opacity to color if it's a hex color
    let finalNodeColor = nodeColor;
    let opacity = isHovered ? 1 : 0.9;

    if (nodeColor.startsWith('#')) {
      const rgbMatch = nodeColor.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
      if (rgbMatch) {
        const r = parseInt(rgbMatch[1], 16);
        const g = parseInt(rgbMatch[2], 16);
        const b = parseInt(rgbMatch[3], 16);
        finalNodeColor = `rgba(${r}, ${g}, ${b}, ${opacity})`;
      }
    }

    // Draw rounded rectangle
    ctx.fillStyle = finalNodeColor;
    ctx.strokeStyle = isHovered ? '#000000' : '#666666';
    ctx.lineWidth = isHovered ? 2 : 1;

    const cornerRadius = 5;

    ctx.beginPath();
    ctx.moveTo(x - rectWidth / 2 + cornerRadius, y - rectHeight / 2);
    ctx.lineTo(x + rectWidth / 2 - cornerRadius, y - rectHeight / 2);
    ctx.quadraticCurveTo(x + rectWidth / 2, y - rectHeight / 2, x + rectWidth / 2, y - rectHeight / 2 + cornerRadius);
    ctx.lineTo(x + rectWidth / 2, y + rectHeight / 2 - cornerRadius);
    ctx.quadraticCurveTo(x + rectWidth / 2, y + rectHeight / 2, x + rectWidth / 2 - cornerRadius, y + rectHeight / 2);
    ctx.lineTo(x - rectWidth / 2 + cornerRadius, y + rectHeight / 2);
    ctx.quadraticCurveTo(x - rectWidth / 2, y + rectHeight / 2, x - rectWidth / 2, y + rectHeight / 2 - cornerRadius);
    ctx.lineTo(x - rectWidth / 2, y - rectHeight / 2 + cornerRadius);
    ctx.quadraticCurveTo(x - rectWidth / 2, y - rectHeight / 2, x - rectWidth / 2 + cornerRadius, y - rectHeight / 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Choose text color based on background brightness
    const r = parseInt(nodeColor.slice(1, 3), 16) || 0;
    const g = parseInt(nodeColor.slice(3, 5), 16) || 0;
    const b = parseInt(nodeColor.slice(5, 7), 16) || 0;
    const brightness = (r * 0.299 + g * 0.587 + b * 0.114);

    ctx.fillStyle = brightness > 128 ? '#000000' : '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(displayLabel, x, y);

    // Function to calculate color brightness (0-255)
    function getBrightness(color) {
      // Default brightness for non-parsable colors
      if (!color || typeof color !== 'string') return 200;

      let r, g, b;

      if (color.startsWith('#')) {
        // Parse hex color
        const hex = color.substring(1);
        r = parseInt(hex.substring(0, 2), 16);
        g = parseInt(hex.substring(2, 4), 16);
        b = parseInt(hex.substring(4, 6), 16);
      } else if (color.startsWith('rgba')) {
        // Parse rgba color
        const rgba = color.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*[\d.]+\)/);
        if (rgba) {
          r = parseInt(rgba[1]);
          g = parseInt(rgba[2]);
          b = parseInt(rgba[3]);
        } else {
          return 200;
        }
      } else if (color.startsWith('rgb')) {
        // Parse rgb color
        const rgb = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (rgb) {
          r = parseInt(rgb[1]);
          g = parseInt(rgb[2]);
          b = parseInt(rgb[3]);
        } else {
          return 200;
        }
      } else if (color.startsWith('hsl')) {
        // For HSL colors, approximate brightness
        return 180; // Default to medium brightness
      } else {
        return 200;
      }

      // Calculate perceived brightness using weighted average
      return (r * 0.299 + g * 0.587 + b * 0.114);
    }
  }, [graphData.links, hoveredNode]);

  // Draw links with proper connections to nodes, including curved links for multiple relationships
  const paintLink = useCallback((link, ctx) => {
    const source = link.source;
    const target = link.target;

    // Get positions and calculate angle
    const x1 = source.x;
    const y1 = source.y;
    const x2 = target.x;
    const y2 = target.y;

    // Get the curvature from link (or default to 0)
    const curvature = link.curvature || 0;

    // Calculate angle and distance
    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);

    // Get node dimensions (stored during node painting)
    const sourceWidth = source.__bckgDimensions?.[0] || 60;
    const sourceHeight = source.__bckgDimensions?.[1] || 30;
    const targetWidth = target.__bckgDimensions?.[0] || 60;
    const targetHeight = target.__bckgDimensions?.[1] || 30;

    // Calculate intersection points with node boundaries precisely
    let startX, startY, endX, endY;

    // Calculate source intersection (which edge of rectangle)
    const sourceHalfWidth = sourceWidth / 2;
    const sourceHalfHeight = sourceHeight / 2;

    // Calculate target intersection (which edge of rectangle)
    const targetHalfWidth = targetWidth / 2;
    const targetHalfHeight = targetHeight / 2;

    // Use modified angle for curved links
    let effectiveAngle = angle;

    // For curved links, we need to adjust the starting and ending angles
    if (curvature > 0) {
      // Calculate control point for the curve
      const controlPointDistance = distance * 0.5;
      const controlPointOffset = distance * curvature;

      // Calculate perpendicular vector
      const perpX = -Math.sin(angle);
      const perpY = Math.cos(angle);

      // Calculate control point
      const cpX = x1 + dx * 0.5 + perpX * controlPointOffset;
      const cpY = y1 + dy * 0.5 + perpY * controlPointOffset;

      // Calculate angles from source to control point and from control point to target
      const angleStart = Math.atan2(cpY - y1, cpX - x1);
      const angleEnd = Math.atan2(y2 - cpY, x2 - cpX);

      // Use these angles for intersection calculations
      startX = x1 + sourceHalfWidth * Math.cos(angleStart);
      startY = y1 + sourceHalfWidth * Math.sin(angleStart);
      endX = x2 - targetHalfWidth * Math.cos(angleEnd);
      endY = y2 - targetHalfWidth * Math.sin(angleEnd);

      // Check if angle intersects horizontal or vertical edges
      if (Math.abs(Math.tan(angleStart)) < sourceHalfHeight / sourceHalfWidth) {
        // Intersects with right or left edge
        const xSign = Math.sign(Math.cos(angleStart));
        startX = x1 + xSign * sourceHalfWidth;
        startY = y1 + Math.tan(angleStart) * xSign * sourceHalfWidth;
      } else {
        // Intersects with top or bottom edge
        const ySign = Math.sign(Math.sin(angleStart));
        startY = y1 + ySign * sourceHalfHeight;
        startX = x1 + (1 / Math.tan(angleStart)) * ySign * sourceHalfHeight;
      }

      // Same for end point
      if (Math.abs(Math.tan(angleEnd)) < targetHalfHeight / targetHalfWidth) {
        // Intersects with right or left edge
        const xSign = -Math.sign(Math.cos(angleEnd));
        endX = x2 + xSign * targetHalfWidth;
        endY = y2 + Math.tan(angleEnd) * xSign * targetHalfWidth;
      } else {
        // Intersects with top or bottom edge
        const ySign = -Math.sign(Math.sin(angleEnd));
        endY = y2 + ySign * targetHalfHeight;
        endX = x2 + (1 / Math.tan(angleEnd)) * ySign * targetHalfHeight;
      }

      // Draw curved link
      ctx.beginPath();
      ctx.moveTo(startX, startY);

      // Create quadratic curve
      ctx.quadraticCurveTo(cpX, cpY, endX, endY);

      // Style based on whether the link is highlighted
      const isHighlighted = hoveredNode &&
          (hoveredNode.id === source.id || hoveredNode.id === target.id);

      ctx.strokeStyle = isHighlighted ? link.color : `${link.color}CC`;
      ctx.lineWidth = isHighlighted ? 2.5 : 1.8;
      ctx.stroke();

      // Draw arrow at the end of the curve
      // We need to calculate the tangent direction at the end point
      const arrowLength = 8;
      const arrowAngle = Math.atan2(endY - cpY, endX - cpX);

      ctx.beginPath();
      ctx.moveTo(endX, endY);
      ctx.lineTo(
          endX - arrowLength * Math.cos(arrowAngle - Math.PI / 6),
          endY - arrowLength * Math.sin(arrowAngle - Math.PI / 6)
      );
      ctx.lineTo(
          endX - arrowLength * Math.cos(arrowAngle + Math.PI / 6),
          endY - arrowLength * Math.sin(arrowAngle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fillStyle = isHighlighted ? link.color : `${link.color}CC`;
      ctx.fill();

      // Draw label for curved links
      if (hoveredNode &&
          (hoveredNode.id === source.id || hoveredNode.id === target.id)) {
        // Position label at the highest point of the curve
        const labelX = cpX;
        const labelY = cpY - 10; // Offset slightly above the curve

        ctx.font = '10px Arial';
        const textWidth = ctx.measureText(link.label).width;

        // Draw text background
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillRect(
            labelX - textWidth / 2 - 3,
            labelY - 7,
            textWidth + 6,
            16
        );

        // Draw text
        ctx.fillStyle = '#000000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(link.label, labelX, labelY);
      }
    } else {
      // For straight links, use the original intersection calculation
      // Check if angle intersects horizontal or vertical edges
      if (Math.abs(Math.tan(angle)) < sourceHalfHeight / sourceHalfWidth) {
        // Intersects with right or left edge
        const xSign = Math.sign(Math.cos(angle));
        startX = x1 + xSign * sourceHalfWidth;
        startY = y1 + Math.tan(angle) * xSign * sourceHalfWidth;
      } else {
        // Intersects with top or bottom edge
        const ySign = Math.sign(Math.sin(angle));
        startY = y1 + ySign * sourceHalfHeight;
        startX = x1 + (1 / Math.tan(angle)) * ySign * sourceHalfHeight;
      }

      // Calculate target intersection (which edge of rectangle)
      if (Math.abs(Math.tan(angle)) < targetHalfHeight / targetHalfWidth) {
        // Intersects with right or left edge
        const xSign = -Math.sign(Math.cos(angle));
        endX = x2 + xSign * targetHalfWidth;
        endY = y2 + Math.tan(angle) * xSign * targetHalfWidth;
      } else {
        // Intersects with top or bottom edge
        const ySign = -Math.sign(Math.sin(angle));
        endY = y2 + ySign * targetHalfHeight;
        endX = x2 + (1 / Math.tan(angle)) * ySign * targetHalfHeight;
      }

      // Handle special case when angle is close to 0 or PI
      if (Math.abs(dy) < 0.001) {
        startX = x1 + Math.sign(dx) * sourceHalfWidth;
        startY = y1;
        endX = x2 - Math.sign(dx) * targetHalfWidth;
        endY = y2;
      }

      // Handle special case when angle is close to PI/2 or 3PI/2
      if (Math.abs(dx) < 0.001) {
        startX = x1;
        startY = y1 + Math.sign(dy) * sourceHalfHeight;
        endX = x2;
        endY = y2 - Math.sign(dy) * targetHalfHeight;
      }

      // Draw straight link
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.strokeStyle = hoveredNode &&
      (hoveredNode.id === source.id || hoveredNode.id === target.id) ? link.color : `${link.color}CC`;
      ctx.lineWidth = hoveredNode &&
      (hoveredNode.id === source.id || hoveredNode.id === target.id) ? 2 : 1.5;
      ctx.stroke();

      // Draw arrow
      const arrowLength = 8;
      ctx.beginPath();
      ctx.moveTo(endX, endY);
      ctx.lineTo(
          endX - arrowLength * Math.cos(angle - Math.PI / 6),
          endY - arrowLength * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(
          endX - arrowLength * Math.cos(angle + Math.PI / 6),
          endY - arrowLength * Math.sin(angle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fillStyle = hoveredNode &&
      (hoveredNode.id === source.id || hoveredNode.id === target.id) ? link.color : `${link.color}CC`;
      ctx.fill();

      // Draw label on hover or for all connected links
      if (hoveredNode &&
          (hoveredNode.id === source.id || hoveredNode.id === target.id)) {
        const midX = (startX + endX) / 2;
        const midY = (startY + endY) / 2;

        // Position label perpendicular to link
        const perpX = -dy / Math.sqrt(dx * dx + dy * dy) * 8;
        const perpY = dx / Math.sqrt(dx * dx + dy * dy) * 8;

        ctx.font = '10px Arial';
        const textWidth = ctx.measureText(link.label).width;

        // Draw text background
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillRect(
            midX + perpX - textWidth / 2 - 3,
            midY + perpY - 7,
            textWidth + 6,
            16
        );

        // Draw text
        ctx.fillStyle = '#000000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(link.label, midX + perpX, midY + perpY);
      }
    }
  }, [hoveredNode]);

  // Handle zooming for "hide all" case
  const handleZoomForHideAll = useCallback(() => {
    if (graphRef.current) {
      // Set a fixed zoom level
      graphRef.current.zoom(0.8);

      // Center on the selected node if present
      if (graphData.nodes.length > 0) {
        const selectedNode = graphData.nodes.find(n => n.isSelected);
        const nodeToCenter = selectedNode || graphData.nodes[0];

        if (nodeToCenter) {
          setTimeout(() => {
            graphRef.current.centerAt(
                nodeToCenter.x,
                nodeToCenter.y,
                1000 // transition duration
            );
          }, 50);
        }
      } else {
        // Center at viewport middle
        graphRef.current.centerAt(
            dimensions.width / 2,
            dimensions.height / 2,
            1000
        );
      }
    }
  }, [graphData.nodes, dimensions]);

  // Set up the graph with better forces
  useEffect(() => {
    if (graphData.nodes.length > 0 && graphRef.current) {
      // Configure force simulation for better spacing
      graphRef.current.d3Force('link').distance(() => 180);
      graphRef.current.d3Force('charge').strength(-800).distanceMax(1500);
      graphRef.current.d3Force('collision', d3.forceCollide().radius(80));

      // Reheat the simulation
      graphRef.current.d3ReheatSimulation();

      // Fit graph to view with a slight delay to ensure the graph has stabilized
      setTimeout(() => {
        if (graphRef.current) {
          // Only auto-fit if we have multiple nodes
          if (graphData.nodes.length > 1) {
            graphRef.current.zoomToFit(400, 100);
          }
          // For single node (like when all relationships are hidden), set a fixed zoom
          else {
            handleZoomForHideAll();
          }
        }
      }, 500);
    }
  }, [graphData, handleZoomForHideAll]);

  return (
      <div className="relative">
        {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-70 z-10">
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
                <div className="mt-2 text-orange-500 font-semibold">Loading graph...</div>
              </div>
            </div>
        )}

        {error && (
            <div className="border border-red-300 bg-red-50 p-4 rounded-md text-red-700">
              <p>{error}</p>
              <p className="text-sm mt-2">
                Try refreshing the page or checking the browser console for more details.
              </p>
            </div>
        )}

        {/* Graph controls */}
        {graphData.nodes.length > 0 && (
            <div className="mb-2 flex gap-2">
              <button
                  onClick={() => graphRef.current?.zoomToFit(400)}
                  className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded-md"
                  title="Fit graph to view"
              >
                <span role="img" aria-label="Fit to view">🔍</span>
              </button>
              <button
                  onClick={() => {
                    if (graphRef.current) {
                      graphRef.current.d3Force('link').distance(() => 250);
                      graphRef.current.d3Force('charge').strength(-1200);
                      graphRef.current.d3ReheatSimulation();
                      setTimeout(() => graphRef.current?.zoomToFit(400), 800);
                    }
                  }}
                  className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded-md"
                  title="Spread nodes"
              >
                <span role="img" aria-label="Spread">↔️</span>
              </button>
              <button
                  onClick={() => graphRef.current?.d3ReheatSimulation()}
                  className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded-md"
                  title="Reheat simulation"
              >
                <span role="img" aria-label="Reheat">🔄</span>
              </button>
              <div className="ml-auto text-sm text-gray-600">
                {graphData.nodes.length} nodes • {graphData.links.length} relationships
              </div>
            </div>
        )}

        {/* Relationship filters */}
        {graphData.nodes.length > 0 && (
            <div className="mb-2 p-3 border rounded-md bg-gray-50">
              <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-200">
                <h3 className="font-semibold text-sm">Relationship Types:</h3>
                <div className="flex gap-3">
                  <button
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                      onClick={() => {
                        toggleAllRelationships(true);
                      }}
                  >
                    Show All
                  </button>
                  <span className="text-gray-400">|</span>
                  <button
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                      onClick={() => {
                        toggleAllRelationships(false);
                        // Apply special zoom handling for "hide all" case
                        setTimeout(handleZoomForHideAll, 100);
                      }}
                  >
                    Hide All
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 text-sm">
                {Object.entries(relationshipTypes).map(([type, {color, count, visible}]) => (
                    <div key={type} className="flex items-center">
                      <label className="flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={visible}
                            onChange={() => toggleRelationship(type)}
                            className="mr-1 h-4 w-4"
                        />
                        <div
                            className="w-6 h-3 mx-1"
                            style={{
                              backgroundColor: color,
                              border: "1px solid rgba(0,0,0,0.2)"  // Add border for better visibility
                            }}
                        ></div>
                        <span className="text-sm font-medium">{type}</span>
                        <span className="text-xs text-gray-500 ml-1">({count})</span>
                      </label>
                    </div>
                ))}
              </div>
              <div className="text-xs text-gray-500 mt-2 text-right">
                Hover to highlight • Click to navigate
              </div>
            </div>
        )}

        {/* Graph container */}
        <div
            ref={containerRef}
            className="w-full h-[600px] border border-gray-300 rounded-md overflow-hidden"
        >
          {graphData.nodes.length > 0 ? (
              <ForceGraph2D
                  ref={graphRef}
                  graphData={graphData}
                  nodeCanvasObject={paintNode}
                  linkCanvasObject={paintLink}
                  onNodeClick={handleNodeClick}
                  onNodeHover={setHoveredNode}
                  enableZoomInteraction={true}
                  enablePanInteraction={true}
                  enableNodeDrag={true}
                  width={dimensions.width}
                  height={dimensions.height}
                  cooldownTicks={100}
                  // Enable curved links
                  linkCurvature="curvature"
                  // Don't use built-in link rendering at all - we'll do it manually
                  linkColor={() => 'rgba(0,0,0,0)'}
                  // Custom node hover area calculation - important for improved hover detection
                  nodePointerAreaPaint={(node, color, ctx) => {
                    // Use stored dimensions or calculate them
                    const nodeWidth = node.__bckgDimensions?.[0] || 60;
                    const nodeHeight = node.__bckgDimensions?.[1] || 30;

                    // Draw a larger invisible area for hit detection
                    ctx.fillStyle = color;
                    ctx.beginPath();
                    const padding = 4; // Extra padding for easier hovering
                    ctx.roundRect(
                        node.x - nodeWidth / 2 - padding,
                        node.y - nodeHeight / 2 - padding,
                        nodeWidth + padding * 2,
                        nodeHeight + padding * 2,
                        5
                    );
                    ctx.fill();
                  }}
              />
          ) : !loading && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center p-4">
                  <p className="text-lg font-semibold text-gray-700">No graph data available</p>
                  <p className="text-sm text-gray-500 mt-2">
                    {Object.keys(relationshipFilters).length > 0 && Object.values(relationshipFilters).every(f => !f.visible)
                        ? "All relationship types are currently hidden. Enable them in the legend above."
                        : "This entity doesn't have any relationships to display in the graph view."}
                  </p>
                </div>
              </div>
          )}
        </div>
      </div>
  );
}